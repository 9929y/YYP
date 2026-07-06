/* =========================================================================
   scroll-roll.js — 「球体内表面 · 太空漫步」滚动引擎 v9
   （v8 架构 + 调研升级：真球面 dome map / sRGB / 速度编排 / 失重惯性 /
     星空纵深 / 速度 vignette / WebKit 降级）
   架构：
   body
   ├─ .navbar (fixed, 不弯曲)
   ├─ #bowl-stars   fixed, 滤镜之外 → 零滤镜开销的三层视差星空
   ├─ #bowl-window  fixed inset(-140px 0) overflow:hidden ← 凹面滤镜
   │   └─ #bowl-wrap  正文, 失重阻尼平移
   ├─ #bowl-vignette fixed, 快滚时的「头盔隧道」暗角
   └─ #bowl-spacer  撑出原生滚动条
   要点：
   · 2D 球面 dome map（径向、球面透视衰减、中带近平保可读）——
     四角/边缘按球面几何收缩 = 真「球体内部」，不再是圆筒假象。
   · color-interpolation-filters="sRGB"：修掉 127 灰非中性导致的静止漂移。
   · 速度编排：severity guard 防抖 + 0.92/帧慢滑衰减（推一把后的太空漂）。
   · Webflow IX2 同步接管（防虚拟滚动下内容被误藏），自建 IO 揭示。
   零依赖，可整体删除恢复原状。
   ========================================================================= */
(function(){
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;
  var WEBKIT = /^((?!chrome|android|crios|edgios).)*safari/i.test(navigator.userAgent);

  var BASE_SCALE = 145;   /* 常驻球面深度 px（明显收腰） */
  var MAX_EXTRA  = 75;    /* 快滚额外加深 */
  var VEL_K      = 0.05;  /* |速度|(px/帧) → 额外深度 */
  var INERTIA    = 4.5;   /* 失重惯性 λ（≈lerp 0.07/帧，1s+ 缓停） */
  var OVERSCAN   = 140;
  var FLAT_R     = 0.22;  /* 中带近平半径（保文字可读/点击命中） */

  function damp(c,t,l,dt){ return c + (t-c)*(1-Math.exp(-l*dt)); }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

  /* ---------- 0. 立即接管 Webflow IX2 ---------- */
  var revealTargets=[];
  [].forEach.call(document.querySelectorAll('[data-w-id]'),function(el){
    el.removeAttribute('data-w-id');
    var st=el.getAttribute('style')||'';
    if(/opacity:\s*0/.test(st)){ el.style.opacity='1'; revealTargets.push(el); }
  });

  function setup(){
    var body=document.body;

    /* ---------- 1. DOM ---------- */
    var stars=document.createElement('canvas');
    stars.id='bowl-stars';
    stars.style.cssText='position:fixed;inset:0;z-index:0;pointer-events:none';
    body.appendChild(stars);

    var win=document.createElement('div');
    win.id='bowl-window';
    win.style.cssText='position:fixed;left:0;right:0;top:'+(-OVERSCAN)+'px;bottom:'+(-OVERSCAN)+'px;overflow:hidden;z-index:1;will-change:filter;contain:paint;pointer-events:none';
    var wrap=document.createElement('div');
    wrap.id='bowl-wrap';
    wrap.style.cssText='position:absolute;left:0;top:0;width:100%;will-change:transform;pointer-events:auto;'+
      /* 微弱 "+" 栅格随页面一起弯曲 —— 让留白处也能读出球面（haoqi 同款线索） */
      'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'56\' height=\'56\'%3E%3Cg fill=\'none\' stroke=\'%23141a26\' stroke-opacity=\'0.06\' stroke-width=\'1\'%3E%3Cpath d=\'M28 23v10M23 28h10\'/%3E%3C/g%3E%3C/svg%3E")';
    [].slice.call(body.childNodes).forEach(function(n){
      if(n===win||n===stars)return;
      if(n.nodeType===1){
        var cls=(n.className||'')+'';
        if(n.tagName==='SCRIPT'||n.tagName==='STYLE'||n.tagName==='LINK'||/w-nav|navbar/.test(cls))return;
      }
      wrap.appendChild(n);
    });
    win.appendChild(wrap);
    body.appendChild(win);

    var vig=document.createElement('div');
    vig.id='bowl-vignette';
    vig.style.cssText='position:fixed;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(20,26,38,.28) 100%);transition:none;will-change:opacity';
    body.appendChild(vig);

    var spacer=document.createElement('div');
    spacer.id='bowl-spacer';spacer.style.cssText='pointer-events:none;visibility:hidden';
    body.appendChild(spacer);
    function sizeSpacer(){spacer.style.height=wrap.scrollHeight+'px';}
    sizeSpacer();window.addEventListener('resize',sizeSpacer);
    setTimeout(sizeSpacer,600);setTimeout(sizeSpacer,2500);

    /* ---------- 2. 真球面 dome 位移滤镜（WebKit 跳过） ---------- */
    var dm=null;
    if(!WEBKIT){
      function winH(){return innerHeight+OVERSCAN*2;}
      /* 凹面（球体内部）map：上下宽、中间窄的沙漏收腰。
         水平位移 dx = x_norm · sin(π·y/H)：
         · 视口垂直中部收缩最强（中间窄），上下边缘为 0（上下宽）
         · 两侧边缘因此弯成 ")(" 弧线 —— 看进球体内部的透视
         G 通道恒 128（不做竖向位移，文字行保持水平、可读）。 */
      var MW=128,MH=128;
      var mapCv=document.createElement('canvas');mapCv.width=MW;mapCv.height=MH;
      var mc=mapCv.getContext('2d');var id=mc.createImageData(MW,MH);
      for(var my=0;my<MH;my++)for(var mx=0;mx<MW;mx++){
        var px=(mx/(MW-1))*2-1;                           /* x: [-1,1] */
        var g=Math.sin(Math.PI*my/(MH-1));                /* y: 中部 1, 上下 0 */
        var dx=px*g;                                      /* 向外采样 = 视觉向心收腰 */
        var o=(my*MW+mx)*4;
        id.data[o]  =Math.round(128+119*dx);
        id.data[o+1]=128;
        id.data[o+2]=128;id.data[o+3]=255;
      }
      mc.putImageData(id,0,0);
      var NS='http://www.w3.org/2000/svg';
      var svg=document.createElementNS(NS,'svg');
      svg.setAttribute('width','0');svg.setAttribute('height','0');
      svg.style.cssText='position:fixed;left:-9999px;top:0';
      var filt=document.createElementNS(NS,'filter');
      filt.setAttribute('id','bowlWarp');
      filt.setAttribute('filterUnits','userSpaceOnUse');
      filt.setAttribute('primitiveUnits','userSpaceOnUse');
      filt.setAttribute('color-interpolation-filters','sRGB');
      filt.setAttribute('x','0');filt.setAttribute('y','0');
      var im=document.createElementNS(NS,'feImage');
      im.setAttribute('href',mapCv.toDataURL());
      im.setAttribute('x','0');im.setAttribute('y','0');
      im.setAttribute('preserveAspectRatio','none');
      im.setAttribute('result','map');
      dm=document.createElementNS(NS,'feDisplacementMap');
      dm.setAttribute('in','SourceGraphic');dm.setAttribute('in2','map');
      dm.setAttribute('xChannelSelector','R');dm.setAttribute('yChannelSelector','G');
      dm.setAttribute('scale',String(BASE_SCALE));
      filt.appendChild(im);filt.appendChild(dm);svg.appendChild(filt);
      body.appendChild(svg);
      function sizeFilter(){
        filt.setAttribute('width',innerWidth);filt.setAttribute('height',winH());
        im.setAttribute('width',innerWidth);im.setAttribute('height',winH());
      }
      sizeFilter();window.addEventListener('resize',sizeFilter);
      win.style.filter='url(#bowlWarp)';
    }

    /* ---------- 3. 自建入场揭示 ---------- */
    revealTargets.forEach(function(el){
      el.style.transition='opacity .9s cubic-bezier(.22,.61,.36,1), transform .9s cubic-bezier(.22,.61,.36,1)';
      el.style.opacity='0';el.style.transform='translateY(22px)';
    });
    var io=new IntersectionObserver(function(es){es.forEach(function(e){
      if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='none';io.unobserve(e.target);}
    });},{threshold:0.12});
    revealTargets.forEach(function(el){io.observe(el);});

    /* ---------- 4. 星空（滤镜之外，零滤镜开销；三层视差） ---------- */
    var sctx=stars.getContext('2d'),SP=[];
    function seedStars(){
      var dpr=Math.min(devicePixelRatio||1,2);
      stars.width=innerWidth*dpr;stars.height=innerHeight*dpr;
      sctx.setTransform(dpr,0,0,dpr,0,0);
      SP=[];
      var layers=[[46,.05,1.1,.16],[34,.12,1.6,.22],[22,.25,2.2,.3]]; /* n,parallax,r,alpha */
      layers.forEach(function(L,li){
        for(var i=0;i<L[0];i++)SP.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,
          p:L[1],r:L[2]*(0.7+Math.random()*0.6),a:L[3]*(0.6+Math.random()*0.8),
          ph:Math.random()*Math.PI*2,li:li});
      });
    }
    seedStars();window.addEventListener('resize',seedStars);

    /* ---------- 4.5 接管页内锚点（fixed wrapper 内原生锚点滚动失效） ---------- */
    document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest&&e.target.closest('a[href^="#"]');
      if(!a)return;
      var id=a.getAttribute('href').slice(1);if(!id)return;
      var target=document.getElementById(id);if(!target)return;
      e.preventDefault();
      var top=target.getBoundingClientRect().top-wrap.getBoundingClientRect().top-80;
      window.scrollTo({top:Math.max(0,top),behavior:'instant'}); /* 惯性由引擎提供 */
    });

    /* ---------- 5. 主循环：统一驱动（一个平滑值驱动一切） ---------- */
    var smoothY=window.pageYOffset||0,intensity=0,last=performance.now();
    window.__bowl={win:win,wrap:wrap,dm:dm,base:BASE_SCALE};
    var lastScale=-1;
    function frame(now){
      var dt=Math.min(0.05,(now-last)/1000)||0;last=now;
      var t=now/1000;
      var y=window.pageYOffset||document.documentElement.scrollTop||0;
      var prev=smoothY;
      smoothY=damp(smoothY,y,INERTIA,dt);                 /* 失重滑行 */
      var velPx=Math.abs(smoothY-prev)/(dt||0.016)/60;    /* px/帧 */
      /* 速度编排：severity guard（只向更强覆盖）+ 慢滑衰减 */
      var target=clamp(velPx*VEL_K,0,1)*MAX_EXTRA;
      if(target>intensity)intensity+=(target-intensity)*Math.min(1,9*dt);
      else intensity*=Math.pow(0.92,dt*60);               /* ~1.4s 太空漂衰减 */
      var sy=Math.round(smoothY*100)/100;
      wrap.style.transform='translate3d(0,'+(-(sy-OVERSCAN)).toFixed(2)+'px,0)';
      if(dm){
        var sc=Math.round((BASE_SCALE+intensity)*10)/10;
        if(sc!==lastScale){dm.setAttribute('scale',sc);lastScale=sc;} /* 静止不写属性 */
      }
      vig.style.opacity=(intensity/MAX_EXTRA*0.85).toFixed(3);
      /* 星空：视差 + 微闪烁 + 缓慢漂移 */
      sctx.clearRect(0,0,innerWidth,innerHeight);
      for(var i=0;i<SP.length;i++){var s=SP[i];
        var yy=(s.y - sy*s.p)%innerHeight; if(yy<0)yy+=innerHeight;
        var tw=0.75+0.25*Math.sin(t*0.7+s.ph);
        sctx.globalAlpha=s.a*tw;
        sctx.fillStyle=s.li===2?'#7f9bd8':'#889ea8';
        sctx.beginPath();sctx.arc(s.x+Math.sin(t*0.11+s.ph)*6,yy,s.r,0,6.283);sctx.fill();
      }
      sctx.globalAlpha=1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
