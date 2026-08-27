/* ============================================================================
   yy-flluid.js — pointer-driven dye field for Flluid Studio.

   Same density + velocity idea as yy-flow.js, rendered as color instead of
   ASCII. Mounts on #flluid-stage. Palette and viscosity come from the toolbar.
   Reduced-motion stamps color without the advection loop.
   ============================================================================ */
(function () {
  'use strict';

  var cv = document.getElementById('flluid-stage');
  if (!cv) return;

  var CELL = 8;
  var RADIUS = 2.4;
  var COLORS = {
    cyan: [126, 232, 242],
    gold: [235, 202, 113],
    blossom: [232, 160, 200],
    ink: [244, 241, 234]
  };

  var color = COLORS.cyan.slice();
  var viscosity = 0.42;
  var ctx, cols, rows, densR, densG, densB, vx, vy, tmpR, tmpG, tmpB, tmpX, tmpY;
  var dpr = 1, cssW = 0, cssH = 0;
  var px = -1e4, py = -1e4, ppx = px, ppy = py, drawing = false, moved = false;
  var running = false, idleFrames = 0, raf = 0, drawn = false;

  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var stage = cv.closest('.fs__stage');

  function hexOrName(value) {
    if (COLORS[value]) return COLORS[value].slice();
    var h = String(value || '').replace(/^#/, '').trim();
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return color.slice();
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function markDrawn() {
    if (drawn) return;
    drawn = true;
    if (stage) stage.classList.add('is-drawn');
  }

  function localXY(e) {
    var rect = cv.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (cssW / Math.max(rect.width, 1)),
      y: (e.clientY - rect.top) * (cssH / Math.max(rect.height, 1))
    };
  }

  function sizeUp() {
    var rect = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = Math.max(1, Math.round(rect.width));
    cssH = Math.max(1, Math.round(rect.height));
    cv.width = Math.floor(cssW * dpr);
    cv.height = Math.floor(cssH * dpr);
    cols = Math.max(8, Math.ceil(cssW / CELL) + 1);
    rows = Math.max(8, Math.ceil(cssH / CELL) + 1);
    var n = cols * rows;
    densR = new Float32Array(n);
    densG = new Float32Array(n);
    densB = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    tmpR = new Float32Array(n);
    tmpG = new Float32Array(n);
    tmpB = new Float32Array(n);
    tmpX = new Float32Array(n);
    tmpY = new Float32Array(n);
    ctx = cv.getContext('2d', { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawn = false;
    if (stage) stage.classList.remove('is-drawn');
  }

  function seed() {
    var dx = px - ppx, dy = py - ppy;
    var speed = Math.min(Math.sqrt(dx * dx + dy * dy) / 18, 1.8);
    var cx = px / CELL, cy = py / CELL;
    var r = RADIUS + 2.5;
    var inject = 0.22 + speed * 0.55;
    for (var j = -r; j <= r; j++) {
      for (var i = -r; i <= r; i++) {
        var gx = Math.round(cx) + i, gy = Math.round(cy) + j;
        if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) continue;
        var d = Math.sqrt(i * i + j * j);
        if (d > r) continue;
        var fall = Math.exp(-(d * d) / (2 * RADIUS * RADIUS));
        var k = gy * cols + gx;
        densR[k] = Math.min(1, densR[k] + fall * inject * (color[0] / 255));
        densG[k] = Math.min(1, densG[k] + fall * inject * (color[1] / 255));
        densB[k] = Math.min(1, densB[k] + fall * inject * (color[2] / 255));
        vx[k] += dx * fall * 0.07;
        vy[k] += dy * fall * 0.07;
      }
    }
    markDrawn();
  }

  function sample(arr, x, y) {
    x = Math.max(1, Math.min(cols - 2, x));
    y = Math.max(1, Math.min(rows - 2, y));
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = x - x0, fy = y - y0;
    var i00 = y0 * cols + x0;
    var i10 = i00 + 1;
    var i01 = i00 + cols;
    var i11 = i01 + 1;
    return arr[i00] * (1 - fx) * (1 - fy) +
      arr[i10] * fx * (1 - fy) +
      arr[i01] * (1 - fx) * fy +
      arr[i11] * fx * fy;
  }

  function step() {
    var visc = viscosity;
    var decay = 1 - (0.018 + visc * 0.03);
    var spread = 0.12 + visc * 0.22;
    var keep = 1 - spread;
    var i, j, k;
    for (j = 1; j < rows - 1; j++) {
      for (i = 1; i < cols - 1; i++) {
        k = j * cols + i;
        var ax = i - vx[k] * 0.12;
        var ay = j - vy[k] * 0.12;
        tmpR[k] = sample(densR, ax, ay);
        tmpG[k] = sample(densG, ax, ay);
        tmpB[k] = sample(densB, ax, ay);
        tmpX[k] = sample(vx, ax, ay);
        tmpY[k] = sample(vy, ax, ay);
      }
    }
    for (j = 1; j < rows - 1; j++) {
      for (i = 1; i < cols - 1; i++) {
        k = j * cols + i;
        densR[k] = (tmpR[k] * keep + (tmpR[k - 1] + tmpR[k + 1] + tmpR[k - cols] + tmpR[k + cols]) * spread * 0.25) * decay;
        densG[k] = (tmpG[k] * keep + (tmpG[k - 1] + tmpG[k + 1] + tmpG[k - cols] + tmpG[k + cols]) * spread * 0.25) * decay;
        densB[k] = (tmpB[k] * keep + (tmpB[k - 1] + tmpB[k + 1] + tmpB[k - cols] + tmpB[k + cols]) * spread * 0.25) * decay;
        vx[k] = tmpX[k] * decay;
        vy[k] = tmpY[k] * decay;
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#121110';
    ctx.fillRect(0, 0, cssW, cssH);
    var i, j, k, a, r, g, b;
    for (j = 0; j < rows; j++) {
      for (i = 0; i < cols; i++) {
        k = j * cols + i;
        r = densR[k]; g = densG[k]; b = densB[k];
        a = Math.max(r, g, b);
        if (a < 0.04) continue;
        var t = Math.min(1, a * 1.35);
        ctx.fillStyle = 'rgba(' +
          Math.round(Math.min(1, r / Math.max(a, 0.0001)) * 255) + ',' +
          Math.round(Math.min(1, g / Math.max(a, 0.0001)) * 255) + ',' +
          Math.round(Math.min(1, b / Math.max(a, 0.0001)) * 255) + ',' +
          (0.22 + t * 0.78).toFixed(3) + ')';
        ctx.fillRect(i * CELL, j * CELL, CELL + 0.5, CELL + 0.5);
      }
    }
  }

  function clearField() {
    if (!densR) return;
    densR.fill(0); densG.fill(0); densB.fill(0); vx.fill(0); vy.fill(0);
    drawn = false;
    if (stage) stage.classList.remove('is-drawn');
    if (ctx) {
      ctx.fillStyle = '#121110';
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  function frame() {
    if (moved) { seed(); ppx = px; ppy = py; moved = false; idleFrames = 0; }
    else idleFrames++;
    if (!RM.matches) step();
    draw();
    if (idleFrames > 180) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (running) return;
    running = true;
    idleFrames = 0;
    raf = requestAnimationFrame(frame);
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cv.setPointerCapture(e.pointerId);
    drawing = true;
    var p = localXY(e);
    px = ppx = p.x; py = ppy = p.y;
    moved = true;
    kick();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drawing) return;
    var p = localXY(e);
    px = p.x; py = p.y;
    moved = true;
    kick();
  }

  function onPointerUp() {
    drawing = false;
  }

  function bindToolbar() {
    var swatches = document.querySelectorAll('[data-flluid-color]');
    swatches.forEach(function (btn) {
      btn.addEventListener('click', function () {
        color = hexOrName(btn.getAttribute('data-flluid-color'));
        swatches.forEach(function (el) { el.setAttribute('aria-pressed', el === btn ? 'true' : 'false'); });
      });
    });
    var visc = document.querySelector('[data-flluid-viscosity]');
    if (visc) {
      viscosity = Number(visc.value) / 100;
      visc.addEventListener('input', function () {
        viscosity = Number(visc.value) / 100;
      });
    }
    var clearer = document.querySelector('[data-flluid-clear]');
    if (clearer) clearer.addEventListener('click', clearField);
  }

  function paintGround() {
    if (!ctx) return;
    ctx.fillStyle = '#121110';
    ctx.fillRect(0, 0, cssW, cssH);
  }

  try {
    bindToolbar();
    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);
    cv.addEventListener('lostpointercapture', onPointerUp);

    function relayout() {
      sizeUp();
      paintGround();
    }

    relayout();
    requestAnimationFrame(relayout);
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(relayout).observe(cv);
    } else {
      var rz = null;
      window.addEventListener('resize', function () {
        clearTimeout(rz);
        rz = setTimeout(relayout, 160);
      }, { passive: true });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      }
    });
  } catch (e) {
    cv.style.display = 'none';
    if (window.console) console.error('[yy-flluid] off:', e);
  }
})();
