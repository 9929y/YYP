import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  /** Solid placeholder color index 0..n-1 (CSS --card-tone). */
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
 * Full-360 cylinder (B / 3d-carousel) + pointer orbit (A / OrbitControls feel).
 * No face labels, no bottom Anchor — hover/detail deferred.
 */
const DRAG_GAIN = 0.12;
const WHEEL_GAIN = 0.08;
const ROTATE_X_MAX = 22;
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

const CarouselFace = memo(function CarouselFace({
  card,
  index,
  faceCount,
  faceWidth,
  radius
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceCount: number;
  faceWidth: number;
  radius: number;
}) {
  const angle = (360 / Math.max(faceCount, 1)) * index;

  const slotStyle: CSSProperties = {
    width: `${faceWidth}px`,
    transform: `rotateY(${angle}deg) translateZ(${radius}px)`
  };

  return (
    <div className="yy-projects-card-slot" style={slotStyle}>
      <div
        className="yy-projects-card"
        data-tone={card.tone % 7}
        style={{ width: `${faceWidth}px` }}
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

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  const cylinderWidth = isScreenSizeSm ? 1100 : 1800;
  const faceCount = cards.length;
  const faceWidth = cylinderWidth / Math.max(faceCount, 1);
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
      // OrbitControls-style: horizontal drag → yaw, vertical → pitch (clamped).
      rotateY.set(rotateY.get() + dx * DRAG_GAIN);
      rotateX.set(clamp(rotateX.get() - dy * DRAG_GAIN, -ROTATE_X_MAX, ROTATE_X_MAX));
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

      if (prefersReducedMotion()) return;

      const coastY = rotateY.get() + velocity.current.x * DRAG_GAIN * 8;
      const coastX = clamp(
        rotateX.get() - velocity.current.y * DRAG_GAIN * 8,
        -ROTATE_X_MAX,
        ROTATE_X_MAX
      );
      void animate(rotateY, coastY, SPRING);
      void animate(rotateX, coastX, SPRING);
    },
    [rotateX, rotateY]
  );

  // Wheel → yaw only; never scroll the page while over the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopOrbit();
      rotateY.set(rotateY.get() + event.deltaY * WHEEL_GAIN + event.deltaX * WHEEL_GAIN);
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
      data-face-count={faceCount}
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
          {cards.map((card, index) => (
            <CarouselFace
              key={card.id}
              card={card}
              index={index}
              faceCount={faceCount}
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
  return (
    <div
      className="yy-projects-carousel yy-projects-carousel--static"
      data-testid="projects-carousel-static"
    >
      <ul className="yy-projects-carousel__grid">
        {cards.map((card) => (
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
