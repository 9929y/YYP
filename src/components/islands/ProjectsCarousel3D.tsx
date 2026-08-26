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
 * Partial cylinder: 8-slot spacing with only 5 faces (3 back slots empty),
 * so ~5 cards stay on screen. Auto yaw pendulum; manual drag is faster.
 * Per-card float/sway is CSS. No labels / Anchor this layer.
 */
const SLOT_COUNT = 8;
const VISIBLE_CARDS = 5;
const DRAG_GAIN_AUTO = 0.1;
const DRAG_GAIN_MANUAL = 0.28;
const WHEEL_GAIN = 0.12;
const ROTATE_X_MAX = 18;
const AUTO_AMP = 28; // deg left-right sway of the whole ring
const AUTO_SPEED = 0.35; // rad/s-ish via sin(t * speed)
const SPRING = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 30,
  mass: 0.1
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Angle for face i on an 8-slot ring, centered on camera (back gap empty). */
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

  const visibleCards = useMemo(() => cards.slice(0, VISIBLE_CARDS), [cards]);

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  // Size faces from the 8-slot ring so five front seats read clearly.
  const cylinderWidth = isScreenSizeSm ? 1200 : 2000;
  const faceWidth = cylinderWidth / SLOT_COUNT;
  const radius = cylinderWidth / (2 * Math.PI);

  const rotateY = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const transform = useTransform(
    [rotateY, rotateX],
    ([y, x]) => `rotateX(${x as number}deg) rotateY(${y as number}deg)`
  );

  const stopOrbit = useCallback(() => {
    rotateY.stop();
    rotateX.stop();
  }, [rotateX, rotateY]);

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
      // Manual: faster than auto gain.
      rotateY.set(rotateY.get() + dx * DRAG_GAIN_MANUAL);
      rotateX.set(
        clamp(rotateX.get() - dy * DRAG_GAIN_AUTO, -ROTATE_X_MAX, ROTATE_X_MAX)
      );
      baseYaw.current = rotateY.get();
    },
    [rotateX, rotateY]
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

      baseYaw.current = rotateY.get();
      autoPausedUntil.current = performance.now() + 900;

      if (prefersReducedMotion()) return;

      const coastY = rotateY.get() + velocity.current.x * DRAG_GAIN_MANUAL * 6;
      const coastX = clamp(
        rotateX.get() - velocity.current.y * DRAG_GAIN_AUTO * 6,
        -ROTATE_X_MAX,
        ROTATE_X_MAX
      );
      baseYaw.current = coastY;
      void animate(rotateY, coastY, SPRING);
      void animate(rotateX, coastX, SPRING);
    },
    [rotateX, rotateY]
  );

  // Auto left-right pendulum when not dragging.
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

  // Wheel → yaw (manual-speed); never scroll the page while over the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopOrbit();
      const delta = event.deltaY * WHEEL_GAIN + event.deltaX * WHEEL_GAIN;
      const next = rotateY.get() + delta;
      rotateY.set(next);
      baseYaw.current = next;
      autoPausedUntil.current = performance.now() + 900;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault();
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('touchmove', onTouchMove);
    };
  }, [rotateY, stopOrbit]);

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
