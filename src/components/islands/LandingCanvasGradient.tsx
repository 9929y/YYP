import { useEffect, useState } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

/**
 * Landing hero canvas — ShaderGradient export (waterPlane / city).
 * Scroll pauses the WebGL clock (~1s). Layer transform/opacity is owned by
 * yy-canvas-motion.js via CSS variables on [data-motion-root].
 *
 * Editor-only export fields (axesHelper, destination, embedMode, format,
 * frameRate, gizmoHelper, bgColor*) are omitted; fov / pixelDensity live on
 * ShaderGradientCanvas.
 */
const BASE_SPEED = 0.1;
const SCROLL_RESUME_MS = 1000;

export default function LandingCanvasGradient() {
  const [allowMotion, setAllowMotion] = useState(false);
  const [animate, setAnimate] = useState<'on' | 'off'>('on');
  const [uSpeed, setUSpeed] = useState(BASE_SPEED);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAllowMotion(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!allowMotion) return;

    let resumeTimer = 0;
    const pauseForScroll = () => {
      setAnimate('off');
      setUSpeed(0);
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        setAnimate('on');
        setUSpeed(BASE_SPEED);
      }, SCROLL_RESUME_MS);
    };

    window.addEventListener('scroll', pauseForScroll, { passive: true });
    window.addEventListener('wheel', pauseForScroll, { passive: true });
    window.addEventListener('touchmove', pauseForScroll, { passive: true });

    return () => {
      window.clearTimeout(resumeTimer);
      window.removeEventListener('scroll', pauseForScroll);
      window.removeEventListener('wheel', pauseForScroll);
      window.removeEventListener('touchmove', pauseForScroll);
    };
  }, [allowMotion]);

  if (!allowMotion) return null;

  return (
    <ShaderGradientCanvas
      className="yy-canvas__gradient"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      pixelDensity={1}
      fov={20}
      pointerEvents="none"
      lazyLoad={false}
    >
      <ShaderGradient
        control="props"
        animate={animate}
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
        uSpeed={uSpeed}
        uStrength={2.5}
        uTime={3.48}
        wireframe={false}
        zoomOut={false}
      />
    </ShaderGradientCanvas>
  );
}
