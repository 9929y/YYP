import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { MotionGate } from './MotionGate';

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
 * Partial 8-slot / 5-card cylinder + OrbitControls-like interaction:
 * elastic rubber-band pitch, damped yaw, zoom with spring settle.
 */
const SLOT_COUNT = 8;
const VISIBLE_CARDS = 5;
const DRAG_YAW = 0.28;
const DRAG_PITCH = 0.16;
const WHEEL_ZOOM = 0.00135;
const ROTATE_X_SOFT = 16;
const ROTATE_X_HARD = 28;
const ZOOM_MIN = 0.78;
const ZOOM_MAX = 1.55;
const ZOOM_SOFT_MIN = 0.68;
const ZOOM_SOFT_MAX = 1.72;
const AUTO_AMP = 28;
const AUTO_SPEED = 0.35;
const RUBBER = 0.32;
const SPRING = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 18,
  mass: 0.35
};
const SPRING_SNAP = {
  type: 'spring' as const,
  stiffness: 160,
  damping: 20,
  mass: 0.28
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Soft overscroll like OrbitControls damping against a limit. */
function rubberBand(value: number, min: number, max: number, resist = RUBBER): number {
  if (value < min) return min + (value - min) * resist;
  if (value > max) return max + (value - max) * resist;
  return value;
}

function faceAngle(index: number): number {
  const step = 360 / SLOT_COUNT;
  const mid = (VISIBLE_CARDS - 1) / 2;
  return (index - mid) * step;
}

const FLOAT_META = [
  { dur: '5.6s', delay: '0s' },
  { dur: '6.4s', delay: '-1.2s' },
  { dur: '7.1s', delay: '-2.4s' },
  { dur: '5.9s', delay: '-0.6s' },
  { dur: '6.8s', delay: '-3.1s' }
] as const;

const CarouselFace = memo(function CarouselFace({
  card,
  index,
  faceWidth,
  radius
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceWidth: number;
  radius: number;
}) {
  const angle = faceAngle(index);
  const float = FLOAT_META[index % FLOAT_META.length];

  const slotStyle: CSSProperties = {
    width: `${faceWidth}px`,
    transform: `rotateY(${angle}deg) translateZ(${radius}px)`
  };

  return (
    <div className="yy-projects-card-slot" style={slotStyle}>
      <div
        className="yy-projects-card yy-projects-card--float"
        data-tone={card.tone % 7}
        style={
          {
            width: `${faceWidth}px`,
            '--float-dur': float.dur,
            '--float-delay': float.delay
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <div className="yy-projects-card__inner" />
      </div>
    </div>
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

  const visibleCards = useMemo(() => cards.slice(0, VISIBLE_CARDS), [cards]);

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  const cylinderWidth = isScreenSizeSm ? 1200 : 2000;
  const faceWidth = cylinderWidth / SLOT_COUNT;
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

    // Pitch: spring toward home (0) — OrbitControls-like elastic settle / 吸附.
    const pitch = rotateX.get();
    const pitchTarget =
      Math.abs(pitch) < 3 ? 0 : clamp(pitch, -ROTATE_X_SOFT, ROTATE_X_SOFT);
    void animate(rotateX, pitchTarget, SPRING_SNAP);

    // Zoom: spring into hard range with a touch of overshoot.
    const z = zoom.get();
    const zoomTarget = clamp(z, ZOOM_MIN, ZOOM_MAX);
    void animate(zoom, zoomTarget, SPRING_SNAP);
  }, [rotateX, zoom]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragging.current = true;
      stopOrbit();
      velocity.current = { x: 0, y: 0 };
      lastPointer.current = { x: event.clientX, y: event.clientY };
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

      // Vertical drag: rubber-band pitch (elastic past soft limit).
      const nextPitch = rubberBand(
        rotateX.get() - dy * DRAG_PITCH,
        -ROTATE_X_SOFT,
        ROTATE_X_SOFT
      );
      rotateX.set(clamp(nextPitch, -ROTATE_X_HARD, ROTATE_X_HARD));

      // Pulling up slightly also eases zoom in (OrbitControls dolly feel).
      if (Math.abs(dy) > Math.abs(dx) * 0.85) {
        const zNext = rubberBand(
          zoom.get() - dy * 0.0018,
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

      // Damped inertia on yaw (OrbitControls enableDamping).
      const coastY = rotateY.get() + velocity.current.x * DRAG_YAW * 7;
      baseYaw.current = coastY;
      void animate(rotateY, coastY, SPRING);
      settleElastic();
    },
    [rotateY, settleElastic]
  );

  // Auto left-right pendulum when idle.
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const paused = dragging.current || now < autoPausedUntil.current;
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

  // Wheel → zoom (OrbitControls dolly); never scroll the page on the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopOrbit();
      autoPausedUntil.current = performance.now() + 1100;

      // Shift+wheel keeps yaw nudge for power users; default is zoom.
      if (event.shiftKey) {
        const next = rotateY.get() + (event.deltaY + event.deltaX) * 0.12;
        rotateY.set(next);
        baseYaw.current = next;
        return;
      }

      const zNext = rubberBand(
        zoom.get() - event.deltaY * WHEEL_ZOOM,
        ZOOM_MIN,
        ZOOM_MAX
      );
      zoom.set(clamp(zNext, ZOOM_SOFT_MIN, ZOOM_SOFT_MAX));

      if (zoomIdle.current) clearTimeout(zoomIdle.current);
      zoomIdle.current = setTimeout(() => {
        settleElastic();
      }, 140);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault();
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      if (zoomIdle.current) clearTimeout(zoomIdle.current);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('touchmove', onTouchMove);
    };
  }, [rotateY, settleElastic, stopOrbit, zoom]);

  return (
    <div
      ref={stageRef}
      className="yy-projects-carousel"
      data-testid="projects-carousel"
      data-slots={SLOT_COUNT}
      data-visible={visibleCards.length}
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
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function ProjectsCarouselStatic({ cards }: { cards: ProjectsCarouselCard[] }) {
  const visibleCards = cards.slice(0, VISIBLE_CARDS);
  return (
    <div
      className="yy-projects-carousel yy-projects-carousel--static"
      data-testid="projects-carousel-static"
    >
      <ul className="yy-projects-carousel__grid">
        {visibleCards.map((card) => (
          <li key={card.id} className="yy-projects-card-slot">
            <div className="yy-projects-card" data-tone={card.tone % 7} data-static="true">
              <div className="yy-projects-card__inner" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectsCarousel3D({
  cards
}: {
  cards: ProjectsCarouselCard[];
}) {
  if (!cards.length) return null;

  return (
    <MotionGate fallback={<ProjectsCarouselStatic cards={cards} />}>
      <ProjectsCarouselMotion cards={cards} />
    </MotionGate>
  );
}

export default ProjectsCarousel3D;
