import { useEffect, useState } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

/**
 * Landing hero canvas — ShaderGradient export (waterPlane / city).
 * Plays continuously; scroll does not pause or scrub the shader.
 * Layer scale / translate / opacity is owned by yy-canvas-motion.js.
 *
 * Editor-only export fields (axesHelper, destination, embedMode, format,
 * frameRate, gizmoHelper, bgColor*) are omitted; fov / pixelDensity live on
 * ShaderGradientCanvas.
 */
const BASE_SPEED = 0.1;

export default function LandingCanvasGradient() {
  const [allowMotion, setAllowMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAllowMotion(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

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
        uSpeed={BASE_SPEED}
        uStrength={2.5}
        uTime={3.48}
        wireframe={false}
        zoomOut={false}
      />
    </ShaderGradientCanvas>
  );
}
