import { useEffect, useState } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

/**
 * Landing hero canvas — ShaderGradient export (waterPlane / city).
 * Plays continuously; scroll does not pause or scrub the shader.
 * Layer scale / translate / opacity / rotate is owned by yy-canvas-motion.js.
 * In the project band, uSpeed drops to 0.7× base (data-motion-zone=projects).
 */
const BASE_SPEED = 0.1;
const PROJECT_SPEED = BASE_SPEED * 0.7;

export default function LandingCanvasGradient() {
  const [allowMotion, setAllowMotion] = useState(false);
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
    const root = document.querySelector('[data-motion-root]');
    if (!root) return;

    const syncSpeed = () => {
      const zone = root.getAttribute('data-motion-zone');
      setUSpeed(zone === 'projects' ? PROJECT_SPEED : BASE_SPEED);
    };

    syncSpeed();
    const mo = new MutationObserver(syncSpeed);
    mo.observe(root, { attributes: true, attributeFilter: ['data-motion-zone'] });
    return () => mo.disconnect();
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
        animate="on"
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
