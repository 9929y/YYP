import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react';

export type ProjectsCarouselCard = {
  id: string;
  title: string;
  scope: string;
  /** Solid placeholder color index 0..n-1 (CSS data-tone). */
  tone: number;
};

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type UseMediaQueryOptions = {
  defaultValue?: boolean;
  initializeWithValue?: boolean;
};

const IS_SERVER = typeof window === 'undefined';

export function useMediaQuery(
  query: string,
  {
    defaultValue = false,
    initializeWithValue = true
  }: UseMediaQueryOptions = {}
): boolean {
  const getMatches = (q: string): boolean => {
    if (IS_SERVER) return defaultValue;
    return window.matchMedia(q).matches;
  };

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) return getMatches(query);
    return defaultValue;
  });

  useIsomorphicLayoutEffect(() => {
    const matchMedia = window.matchMedia(query);
    const handleChange = () => setMatches(matchMedia.matches);
    handleChange();
    matchMedia.addEventListener('change', handleChange);
    return () => matchMedia.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

/*
 * Open arc: size from an 8-slot ring (back ~3 seats empty), place 5 cards on the
 * front. Wider spread + gaps; cylinder seat only (no local tilt); soft float;
 * near-large/far-small scale; ground shadow under each plate.
 *
 * Intro + open MUST share the same transform function chain so Motion never
 * interpolates through an identity / planar frame.
 */
const SLOT_COUNT = 8;
const VISIBLE_CARDS = 5;
/** Degrees between seats — open enough for gaps, outer faces still readable. */
const ARC_STEP = 40;
/** Face width as a fraction of seat arc length (~18% air between neighbors). */
const FACE_GAP = 0.82;
const DRAG_YAW = 0.32;
const DRAG_PITCH = 0.2;
const WHEEL_ZOOM = 0.0024;
const ROTATE_X_SOFT = 18;
const ROTATE_X_HARD = 32;
const ZOOM_MIN = 0.72;
const ZOOM_MAX = 1.45;
const ZOOM_SOFT_MIN = 0.62;
const ZOOM_SOFT_MAX = 1.58;
const AUTO_AMP = 28;
const AUTO_SPEED = 0.35;
const RUBBER = 0.32;
const SPRING = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 30,
  mass: 0.1
};
const SPRING_SNAP = {
  type: 'spring' as const,
  stiffness: 160,
  damping: 20,
  mass: 0.28
};
const INTRO_EASE = {
  type: 'tween' as const,
  duration: 1.05,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rubberBand(value: number, min: number, max: number, resist = RUBBER): number {
  if (value < min) return min + (value - min) * resist;
  if (value > max) return max + (value - max) * resist;
  return value;
}

function faceAngle(index: number): number {
  const mid = (VISIBLE_CARDS - 1) / 2;
  return (index - mid) * ARC_STEP;
}

/** Near-large / far-small — center ~1, outer seats ~0.82–0.88. */
function depthScale(index: number): number {
  return 1 - (Math.abs(faceAngle(index)) / 90) * 0.28;
}

/**
 * Shared chain: rotateY(seat) → translateZ → scale(depth * intro).
 * No local pitch/roll/yaw tilt — faces stay upright on the cylinder.
 */
function cardTransform(
  index: number,
  radius: number,
  {
    yawScale,
    radiusScale,
    scale
  }: {
    yawScale: number;
    radiusScale: number;
    scale: number;
  }
): string {
  const yaw = faceAngle(index) * yawScale;
  const s = depthScale(index) * scale;
  return [
    `rotateY(${yaw}deg)`,
    `translateZ(${radius * radiusScale}px)`,
    `scale(${s})`
  ].join(' ');
}

function openTransform(index: number, radius: number): string {
  return cardTransform(index, radius, {
    yawScale: 1,
    radiusScale: 1,
    scale: 1
  });
}

/**
 * Intro start pose — compact 3D wedge (never planar / never flat grid).
 * Same transform chain as openTransform for clean interpolation.
 */
function introTransform(index: number, radius: number): string {
  return cardTransform(index, radius, {
    yawScale: 0.62,
    radiusScale: 0.48,
    scale: 0.62
  });
}

const CarouselFace = memo(function CarouselFace({
  card,
  index,
  faceWidth,
  radius,
  spread,
  settled
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceWidth: number;
  radius: number;
  spread: boolean;
  settled: boolean;
}) {
  const reduced = prefersReducedMotion();
  const from = introTransform(index, radius);
  const to = openTransform(index, radius);
  const floatDelay = `${index * 0.55}s`;

  return (
    <motion.div
      className="yy-projects-card-slot"
      style={{
        width: `${faceWidth}px`,
        transformStyle: 'preserve-3d'
      }}
      initial={false}
      animate={{
        opacity: 1,
        transform: reduced || spread ? to : from
      }}
      transition={
        reduced
          ? { duration: 0 }
          : settled
            ? SPRING
            : {
                ...INTRO_EASE,
                delay: spread ? 0.06 : 0
              }
      }
    >
      <div
        className={
          settled
            ? 'yy-projects-card-float is-floating'
            : 'yy-projects-card-float'
        }
        style={{ animationDelay: floatDelay }}
      >
        <div
          className="yy-projects-card"
          data-tone={card.tone % 7}
          style={{ width: `${faceWidth}px` }}
          aria-hidden="true"
        >
          <div className="yy-projects-card__inner" />
        </div>
      </div>
      <div
        className={
          settled
            ? 'yy-projects-card-shadow is-floating'
            : 'yy-projects-card-shadow'
        }
        style={{
          width: `${faceWidth * 0.78}px`,
          animationDelay: floatDelay
        }}
        aria-hidden="true"
      />
    </motion.div>
  );
});

function ProjectsCarouselMotion({ cards }: { cards: ProjectsCarouselCard[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const baseYaw = useRef(0);
  const autoPhase = useRef(0);
  const autoPausedUntil = useRef(0);
  const autoWasPaused = useRef(false);
  const zoomIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  const pinchDist = useRef<number | null>(null);

  // SSR + first client paint: compact 3D wedge. Hold briefly, then fan open.
  // Never mount a flat-grid fallback (that was the one-frame planar flash).
  const [spread, setSpread] = useState(() => prefersReducedMotion());
  const [settled, setSettled] = useState(() => prefersReducedMotion());
  settledRef.current = settled;

  const visibleCards = useMemo(() => cards.slice(0, VISIBLE_CARDS), [cards]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setSpread(true);
      setSettled(true);
      settledRef.current = true;
      return;
    }
    // Timers only (no nested rAF) so Strict Mode remounts still settle reliably.
    autoPausedUntil.current = performance.now() + 2200;
    const openTimer = window.setTimeout(() => setSpread(true), 100);
    const doneTimer = window.setTimeout(() => {
      setSettled(true);
      settledRef.current = true;
    }, 1400);
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  // Wider 8-slot ring; face width from seat arc so neighbors keep air.
  const cylinderWidth = isScreenSizeSm ? 1560 : 2680;
  const seatArc = (ARC_STEP / 360) * cylinderWidth;
  const faceWidth = seatArc * FACE_GAP;
  const radius = cylinderWidth / (2 * Math.PI);

  const rotateY = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const zoom = useMotionValue(1);
  const transform = useTransform(
    [rotateY, rotateX, zoom],
    ([y, x, z]) =>
      `scale(${z as number}) rotateX(${x as number}deg) rotateY(${y as number}deg)`
  );

  const stopOrbit = useCallback(() => {
    rotateY.stop();
    rotateX.stop();
    zoom.stop();
  }, [rotateX, rotateY, zoom]);

  const settleElastic = useCallback(() => {
    if (prefersReducedMotion()) {
      rotateX.set(clamp(rotateX.get(), -ROTATE_X_SOFT, ROTATE_X_SOFT));
      zoom.set(clamp(zoom.get(), ZOOM_MIN, ZOOM_MAX));
      return;
    }

    const pitch = rotateX.get();
    const pitchTarget =
      Math.abs(pitch) < 3 ? 0 : clamp(pitch, -ROTATE_X_SOFT, ROTATE_X_SOFT);
    void animate(rotateX, pitchTarget, SPRING_SNAP);

    const z = zoom.get();
    void animate(zoom, clamp(z, ZOOM_MIN, ZOOM_MAX), SPRING_SNAP);
  }, [rotateX, zoom]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Allow orbit as soon as the island is live (do not wait on settle gate).
      if (event.button !== 0) return;
      dragging.current = true;
      stopOrbit();
      velocity.current = { x: 0, y: 0 };
      lastPointer.current = { x: event.clientX, y: event.clientY };
      autoPausedUntil.current = Number.POSITIVE_INFINITY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [stopOrbit]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      velocity.current = { x: dx, y: dy };

      rotateY.set(rotateY.get() + dx * DRAG_YAW);

      const nextPitch = rubberBand(
        rotateX.get() - dy * DRAG_PITCH,
        -ROTATE_X_SOFT,
        ROTATE_X_SOFT
      );
      rotateX.set(clamp(nextPitch, -ROTATE_X_HARD, ROTATE_X_HARD));

      // Vertical drag also dollies zoom (OrbitControls-like).
      if (Math.abs(dy) > Math.abs(dx) * 0.55) {
        const zNext = rubberBand(
          zoom.get() - dy * 0.0026,
          ZOOM_MIN,
          ZOOM_MAX
        );
        zoom.set(clamp(zNext, ZOOM_SOFT_MIN, ZOOM_SOFT_MAX));
      }

      baseYaw.current = rotateY.get();
    },
    [rotateX, rotateY, zoom]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      autoPausedUntil.current = performance.now() + 1100;

      if (prefersReducedMotion()) {
        baseYaw.current = rotateY.get();
        settleElastic();
        return;
      }

      const coastY = rotateY.get() + velocity.current.x * DRAG_YAW * 7;
      baseYaw.current = coastY;
      void animate(rotateY, coastY, SPRING);
      settleElastic();
    },
    [rotateY, settleElastic]
  );

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const paused =
        dragging.current ||
        now < autoPausedUntil.current ||
        !settledRef.current;
      if (paused) {
        autoWasPaused.current = true;
      } else {
        if (autoWasPaused.current) {
          baseYaw.current = rotateY.get();
          autoPhase.current = 0;
          autoWasPaused.current = false;
        }
        autoPhase.current += dt * AUTO_SPEED;
        rotateY.set(baseYaw.current + Math.sin(autoPhase.current) * AUTO_AMP);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rotateY]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const applyZoomDelta = (delta: number) => {
      stopOrbit();
      autoPausedUntil.current = performance.now() + 1100;
      const zNext = rubberBand(zoom.get() - delta, ZOOM_MIN, ZOOM_MAX);
      zoom.set(clamp(zNext, ZOOM_SOFT_MIN, ZOOM_SOFT_MAX));
      if (zoomIdle.current) clearTimeout(zoomIdle.current);
      zoomIdle.current = setTimeout(() => {
        settleElastic();
      }, 140);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Trackpad pinch arrives as ctrl+wheel; treat as zoom too.
      if (event.shiftKey) {
        stopOrbit();
        autoPausedUntil.current = performance.now() + 1100;
        const next = rotateY.get() + (event.deltaY + event.deltaX) * 0.14;
        rotateY.set(next);
        baseYaw.current = next;
        return;
      }
      applyZoomDelta(event.deltaY * WHEEL_ZOOM);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (dragging.current || event.touches.length === 2) {
        event.preventDefault();
      }
      if (event.touches.length === 2) {
        const a = event.touches[0];
        const b = event.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const prev = pinchDist.current;
        pinchDist.current = dist;
        if (prev != null) applyZoomDelta((prev - dist) * 0.012);
      }
    };

    const onTouchEnd = () => {
      pinchDist.current = null;
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);
    stage.addEventListener('touchcancel', onTouchEnd);
    return () => {
      if (zoomIdle.current) clearTimeout(zoomIdle.current);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [rotateY, settleElastic, stopOrbit, zoom]);

  return (
    <div
      ref={stageRef}
      className="yy-projects-carousel"
      data-testid="projects-carousel"
      data-slots={SLOT_COUNT}
      data-visible={visibleCards.length}
      data-spread={spread ? 'true' : 'false'}
      data-settled={settled ? 'true' : 'false'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="yy-projects-carousel__stage">
        <motion.div
          className="yy-projects-carousel__cylinder"
          style={{
            transform,
            width: cylinderWidth,
            transformStyle: 'preserve-3d'
          }}
        >
          {visibleCards.map((card, index) => (
            <CarouselFace
              key={card.id}
              card={card}
              index={index}
              faceWidth={faceWidth}
              radius={radius}
              spread={spread}
              settled={settled}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function ProjectsCarousel3D({
  cards
}: {
  cards: ProjectsCarouselCard[];
}) {
  if (!cards.length) return null;
  // Always mount the 3D stage (no flat-grid MotionGate fallback flash).
  return <ProjectsCarouselMotion cards={cards} />;
}

export default ProjectsCarousel3D;
