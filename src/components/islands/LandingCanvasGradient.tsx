import { useEffect, useState } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

/**
 * Landing hero canvas — ShaderGradient export (waterPlane / city).
 * Layer scale / translate / opacity / rotate is owned by yy-canvas-motion.js.
 * In the project band, uSpeed drops to 0.7× base (data-motion-zone=projects).
 * Hovering a project card (.slot) pauses the shader so it does not compete
 * with the thumbnail. Expanded nav panels also pause via yy:panel-state.
 * yy-canvas-motion still owns opacity / scale / rotate / cover.
 *
 * Entry: still image paints immediately; WebGL mounts after first paint / idle,
 * then crossfades in once the first frame is ready (avoids refresh hitch).
 */
const BASE_SPEED = 0.1;
const PROJECT_SPEED = BASE_SPEED * 0.7;
/** Let CSS intro / first paint settle before compiling WebGL. */
const MOUNT_DELAY_MS = 320;

function scheduleIdle(cb: () => void, timeout = 1200): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as Window & {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 0);
  return () => window.clearTimeout(id);
}

function markCanvasLive(live: boolean) {
  const layer = document.querySelector('.yy-canvas');
  if (!layer) return;
  layer.setAttribute('data-canvas-live', live ? 'true' : 'false');
}

export default function LandingCanvasGradient() {
  const [allowMotion, setAllowMotion] = useState(false);
  const [mountCanvas, setMountCanvas] = useState(false);
  const [uSpeed, setUSpeed] = useState(BASE_SPEED);
  const [pixelDensity, setPixelDensity] = useState(1);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [slotHover, setSlotHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAllowMotion(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* Cap DPR on high-density / small screens — cheaper first compile. */
  useEffect(() => {
    if (!allowMotion) return;
    const dpr = window.devicePixelRatio || 1;
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    setPixelDensity(narrow || dpr >= 2 ? 0.75 : 1);
  }, [allowMotion]);

  /* Defer WebGL until after intro/first paint so refresh doesn't hitch. */
  useEffect(() => {
    if (!allowMotion) {
      markCanvasLive(false);
      setMountCanvas(false);
      return;
    }

    let cancelled = false;
    let cancelIdle = () => {};
    const delayId = window.setTimeout(() => {
      cancelIdle = scheduleIdle(() => {
        if (!cancelled) setMountCanvas(true);
      });
    }, MOUNT_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(delayId);
      cancelIdle();
    };
  }, [allowMotion]);

  /* Crossfade once the R3F canvas has a real buffer (first draw). */
  useEffect(() => {
    if (!mountCanvas) {
      markCanvasLive(false);
      return;
    }

    let cancelled = false;
    let tries = 0;
    const layer = document.querySelector('.yy-canvas');

    const tick = () => {
      if (cancelled) return;
      const canvas = layer?.querySelector('canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) markCanvasLive(true);
          });
        });
        return;
      }
      if (tries++ < 180) {
        requestAnimationFrame(tick);
        return;
      }
      /* Fail-open: still shows underneath if WebGL never reports size. */
      if (!cancelled) markCanvasLive(true);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [mountCanvas]);

  useEffect(() => {
    if (!allowMotion) return;
    const root = document.querySelector('[data-motion-root]');
    if (!root) return;

    const syncSpeed = () => {
      const zone = root.getAttribute('data-motion-zone') || 'hero';
      setUSpeed(zone === 'projects' ? PROJECT_SPEED : BASE_SPEED);
    };

    syncSpeed();
    const mo = new MutationObserver(syncSpeed);
    mo.observe(root, { attributes: true, attributeFilter: ['data-motion-zone'] });
    return () => mo.disconnect();
  }, [allowMotion]);

  useEffect(() => {
    const onPanelState = (event: Event) => {
      setPanelExpanded(Boolean((event as CustomEvent<{ expanded?: boolean }>).detail?.expanded));
    };

    window.addEventListener('yy:panel-state', onPanelState);
    return () => window.removeEventListener('yy:panel-state', onPanelState);
  }, []);

  useEffect(() => {
    const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const slots = Array.from(document.querySelectorAll('.slot'));
    const onEnter = () => {
      if (hoverMq.matches) setSlotHover(true);
    };
    const onLeave = () => setSlotHover(false);
    slots.forEach((slot) => {
      slot.addEventListener('pointerenter', onEnter);
      slot.addEventListener('pointerleave', onLeave);
    });
    return () => {
      slots.forEach((slot) => {
        slot.removeEventListener('pointerenter', onEnter);
        slot.removeEventListener('pointerleave', onLeave);
      });
    };
  }, []);

  const pauseForThumbnail = slotHover;
  const motionActive = !panelExpanded && !pauseForThumbnail;
  const activeSpeed = motionActive ? uSpeed : 0;

  useEffect(() => {
    const layer = document.querySelector('.yy-canvas');
    if (!layer) return;
    layer.setAttribute('data-canvas-paused', motionActive ? 'false' : 'true');
  }, [motionActive]);

  if (!allowMotion || !mountCanvas) return null;

  return (
    <ShaderGradientCanvas
      className="yy-canvas__gradient"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      pixelDensity={pixelDensity}
      fov={20}
      pointerEvents="none"
      lazyLoad={false}
      powerPreference="high-performance"
    >
      <ShaderGradient
        control="props"
        animate={motionActive ? 'on' : 'off'}
        brightness={1.2}
        cAzimuthAngle={200}
        cDistance={9.4}
        cPolarAngle={115}
        cameraZoom={1}
        color1="#d9fcff"
        color2="#e7f3fe"
        color3="#ebca71"
        envPreset="city"
        grain="off"
        lightType="3d"
        loop="on"
        loopDuration={10}
        positionX={-0.5}
        positionY={0.1}
        positionZ={0}
        range="enabled"
        rangeEnd={40}
        rangeStart={0}
        reflection={0.1}
        rotationX={0}
        rotationY={0}
        rotationZ={235}
        shader="defaults"
        toggleAxis={false}
        type="waterPlane"
        uAmplitude={0}
        uDensity={1.1}
        uFrequency={5.5}
        uSpeed={activeSpeed}
        uStrength={2.5}
        uTime={3.48}
        wireframe={false}
        zoomOut={false}
      />
    </ShaderGradientCanvas>
  );
}
