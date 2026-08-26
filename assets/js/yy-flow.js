/* ============================================================================
   yy-flow.js — the cursor-driven ASCII diffusion field.

   Reproduced from the reference site's own declaration, not from watching it.
   Source: kedavra-me-design-system/raw/kedavra-inline-animation.js

       createShader(document.getElementById("hero-cursor-flow"), {
         components: [
           { type: 'ChromaFlow', props: {
               baseColor:'#75FB4C', downColor:'#75FB4C', upColor:'#3FD34E',
               leftColor:'#3FD34E', rightColor:'#75FB4C',
               intensity: 1.5, momentum: 40, radius: 2 } },
           { type: 'Ascii', props: {
               alphaThreshold: 0.1, cellSize: 8,
               characters: 'k@e$d%a&v*r(a' } },
         ]
       })

   The reference imports a shader library from esm.sh. That is a runtime
   third-party dependency on a CDN, which this repo does not have and should not
   acquire, so the same parameters are implemented directly on a 2D canvas:

     ChromaFlow  -> a density + velocity field seeded at the pointer, advected
                    and diffused each frame, decaying at a rate set by momentum.
     Ascii       -> the field quantised to an 8px grid and drawn as glyphs from
                    the 13-character ramp, cells below alphaThreshold skipped.

   The glyph ramp is the reference's, verbatim: 'k@e$d%a&v*r(a' — the site's own
   name interleaved with symbols, which is why its texture reads as language
   rather than as noise.
   ============================================================================ */
(function () {
  'use strict';

  /* ---- landing ShaderGradient palette (waterPlane export) ----
     color1 #d9fcff, color2 #e7f3fe, color3 #ebca71 — three chroma stops
     mapped like the original base / alt / idle roles. */
  var CHARS      = 'k@e$d%a&v*r(a';
  var CELL       = 8;
  var ALPHA_MIN  = 0.1;
  var INTENSITY  = 1.5;
  var MOMENTUM   = 40;
  var RADIUS     = 2;
  var C_BASE     = [0xd9, 0xfc, 0xff];   /* #d9fcff cyan */
  var C_ALT      = [0xeb, 0xca, 0x71];   /* #ebca71 gold */
  var C_IDLE     = [0xe7, 0xf3, 0xfe];   /* #e7f3fe soft blue edge */

  var cv = document.getElementById('yy-flow');
  if (!cv) return;

  /* Desktop with a real pointer only, and never when motion is reduced —
     a full-viewport animated field is exactly what that preference is about. */
  var MQ = matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)');
  var RM = matchMedia('(prefers-reduced-motion: reduce)');

  var ctx, cols, rows, dens, vx, vy, dpr = 1;
  var px = -1e4, py = -1e4, ppx = px, ppy = py, moved = false;
  var running = false, idleFrames = 0, raf = 0;

  function sizeUp() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = innerWidth, h = innerHeight;
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cols = Math.ceil(w / CELL) + 1;
    rows = Math.ceil(h / CELL) + 1;
    dens = new Float32Array(cols * rows);
    vx = new Float32Array(cols * rows);
    vy = new Float32Array(cols * rows);
    ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '600 ' + CELL + 'px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textBaseline = 'top';
  }

  /* Seed density and velocity at the pointer. radius 2 cells, weighted by how
     fast the pointer is moving — a slow drift barely disturbs the field, a fast
     sweep drags a wake through it. That speed dependence is what makes it read
     as fluid rather than as a brush. */
  function seed() {
    var dx = px - ppx, dy = py - ppy;
    var speed = Math.min(Math.sqrt(dx * dx + dy * dy) / 24, 1.6);
    var cx = px / CELL, cy = py / CELL;
    var r = RADIUS + 2;
    for (var j = -r; j <= r; j++) {
      for (var i = -r; i <= r; i++) {
        var gx = Math.round(cx) + i, gy = Math.round(cy) + j;
        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
        var d = Math.sqrt(i * i + j * j);
        if (d > r) continue;
        var fall = Math.exp(-(d * d) / (2 * RADIUS * RADIUS));
        var k = gy * cols + gx;
        dens[k] = Math.min(1, dens[k] + fall * INTENSITY * (0.16 + speed * 0.5));
        vx[k] += dx * fall * 0.05;
        vy[k] += dy * fall * 0.05;
      }
    }
  }

  /* One simulation step: advect along the local velocity, diffuse into the
     4-neighbourhood, then decay. momentum 40 sets the decay so the field holds
     a trail for roughly forty frames rather than snapping back. */
  var tmp = null;
  function step() {
    if (!tmp || tmp.length !== dens.length) tmp = new Float32Array(dens.length);
    var decay = 1 - 1 / MOMENTUM;
    var i, j, k;
    for (j = 1; j < rows - 1; j++) {
      for (i = 1; i < cols - 1; i++) {
        k = j * cols + i;
        var c = dens[k];
        var n = (dens[k - 1] + dens[k + 1] + dens[k - cols] + dens[k + cols]) * 0.25;
        /* 0.82 self / 0.18 neighbours — enough spread to look diffuse, little
           enough that the cursor still has a defined core. */
        tmp[k] = (c * 0.82 + n * 0.18) * decay;
        vx[k] *= decay;
        vy[k] *= decay;
      }
    }
    var swap = dens; dens = tmp; tmp = swap;
  }

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var ramp = CHARS.length - 1;
    var i, j, k;
    for (j = 0; j < rows; j++) {
      for (i = 0; i < cols; i++) {
        k = j * cols + i;
        var d = dens[k];
        if (d < ALPHA_MIN) continue;                  /* alphaThreshold */
        var t = Math.min(d, 1);
        /* Direction picks between cyan (#d9fcff) and gold (#ebca71); soft blue
           (#e7f3fe) fills the diffuse edge — three stops from the hero gradient. */
        var horiz = vx[k], vert = vy[k];
        var dir = (Math.abs(horiz) > Math.abs(vert))
          ? (horiz > 0 ? 1 : 0)
          : (vert > 0 ? 1 : 0);
        var target = dir ? C_BASE : C_ALT;
        /* Soft blue at the diffuse edge, saturated chroma in the core. */
        var m = Math.pow(t, 1.5);
        var r = Math.round(C_IDLE[0] + (target[0] - C_IDLE[0]) * m);
        var g = Math.round(C_IDLE[1] + (target[1] - C_IDLE[1]) * m);
        var bl = Math.round(C_IDLE[2] + (target[2] - C_IDLE[2]) * m);
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + bl + ',' + (0.28 + t * 0.62).toFixed(3) + ')';
        ctx.fillText(CHARS.charAt(Math.min(ramp, Math.floor(t * ramp))), i * CELL, j * CELL);
      }
    }
  }

  function frame() {
    if (moved) { seed(); ppx = px; ppy = py; moved = false; idleFrames = 0; }
    else idleFrames++;
    step();
    draw();
    /* Stop the loop once the field has fully decayed — no rAF burning while the
       page sits idle. A pointer move restarts it. */
    if (idleFrames > MOMENTUM * 4) { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (running || !MQ.matches || RM.matches) return;
    running = true; idleFrames = 0;
    raf = requestAnimationFrame(frame);
  }

  function standDown() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    if (ctx) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  try {
    sizeUp();

    window.addEventListener('mousemove', function (e) {
      if (!MQ.matches || RM.matches) { standDown(); return; }
      if (px < -1000) { ppx = e.clientX; ppy = e.clientY; }
      px = e.clientX; py = e.clientY; moved = true;
      kick();
    }, { passive: true });

    var rz = null;
    window.addEventListener('resize', function () {
      clearTimeout(rz);
      rz = setTimeout(function () { sizeUp(); if (!MQ.matches || RM.matches) standDown(); }, 160);
    }, { passive: true });

    var onChange = function () { if (!MQ.matches || RM.matches) standDown(); };
    if (MQ.addEventListener) { MQ.addEventListener('change', onChange); RM.addEventListener('change', onChange); }
    else if (MQ.addListener) { MQ.addListener(onChange); RM.addListener(onChange); }

    /* Never keep simulating a field nobody is looking at. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) standDown();
    });
  } catch (e) {
    standDown();
    cv.style.display = 'none';
    if (window.console) console.error('[yy-flow] off:', e);
  }
})();
