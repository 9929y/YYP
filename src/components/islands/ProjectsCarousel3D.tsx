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
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';

export type ProjectsCarouselCard = {
  id: string;
  title: string;
  scope: string;
  /** Solid placeholder color index 0..n-1 (CSS data-tone). */
  tone: number;
  /** Optional project cover / poster for capsule photo faces. */
  coverSrc?: string;
  coverAlt?: string;
  /** Case-study URL — click navigates when set. */
  href?: string | null;
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
 * Open arc: 8-slot ring, 5 front seats. Portfolio shelf: face-on open, large
 * faces, sharp covers, hover + click-to-navigate, orbit/zoom preserved.
 * Intro + open share the same transform chain (no planar flash).
 */
const SLOT_COUNT = 8;
const VISIBLE_CARDS = 5;
/** Degrees between seats — tighter = more face-on readable. */
const ARC_STEP_PAGE = 34;
const ARC_STEP_PANEL = 30;
const FACE_GAP = 0.86;
const DRAG_YAW = 0.32;
const DRAG_PITCH = 0.2;
const WHEEL_ZOOM = 0.0024;
const WHEEL_YAW = 0.16;
const ROTATE_X_SOFT = 18;
const ROTATE_X_HARD = 32;
/** Near-zero lean so first view reads front-facing. */
const REST_LEAN_PAGE = 2;
const REST_LEAN_PANEL = 0;
const ZOOM_MIN = 0.72;
const ZOOM_MAX = 1.55;
const ZOOM_SOFT_MIN = 0.62;
const ZOOM_SOFT_MAX = 1.68;
const ZOOM_DEFAULT_PANEL = 1.22;
const ZOOM_DEFAULT_PAGE = 1.08;
/** Slow ambient yaw after idle (deg/sec). */
const AUTO_SPIN = 3.2;
const RUBBER = 0.32;
const CLICK_DRAG_PX = 8;
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

function faceAngle(index: number, step: number): number {
  const mid = (VISIBLE_CARDS - 1) / 2;
  return (index - mid) * step;
}

/** Near-large / far-small — readable outer seats (not vanishing). */
function depthScale(index: number, step: number): number {
  const t = Math.abs(faceAngle(index, step)) / 90;
  return clamp(1.04 - t * 0.32, 0.72, 1.04);
}

function depthOpacity(index: number, step: number): number {
  const t = Math.abs(faceAngle(index, step)) / 90;
  return clamp(1 - t * 0.28, 0.72, 1);
}

function cardTransform(
  index: number,
  radius: number,
  step: number,
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
  const yaw = faceAngle(index, step) * yawScale;
  const s = depthScale(index, step) * scale;
  return [
    `rotateY(${yaw}deg)`,
    `translateZ(${radius * radiusScale}px)`,
    `scale(${s})`
  ].join(' ');
}

function openTransform(index: number, radius: number, step: number): string {
  return cardTransform(index, radius, step, {
    yawScale: 1,
    radiusScale: 1,
    scale: 1
  });
}

function introTransform(index: number, radius: number, step: number): string {
  return cardTransform(index, radius, step, {
    yawScale: 0.55,
    radiusScale: 0.42,
    scale: 0.58
  });
}

const CarouselFace = memo(function CarouselFace({
  card,
  index,
  faceWidth,
  radius,
  arcStep,
  spread,
  settled,
  onHoverChange
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceWidth: number;
  radius: number;
  arcStep: number;
  spread: boolean;
  settled: boolean;
  onHoverChange: (hovered: boolean) => void;
}) {
  const reduced = prefersReducedMotion();
  const from = introTransform(index, radius, arcStep);
  const to = openTransform(index, radius, arcStep);
  const floatDelay = `${index * 0.45}s`;
  const opacity = depthOpacity(index, arcStep);
  const href = card.href || undefined;
  const Tag = href ? 'a' : 'div';

  return (
    <motion.div
      className="yy-projects-card-slot"
      style={{
        width: `${faceWidth}px`,
        transformStyle: 'preserve-3d'
      }}
      initial={false}
      animate={{
        opacity,
        transform: reduced || spread ? to : from
      }}
      transition={
        reduced
          ? { duration: 0 }
          : settled
            ? SPRING
            : {
                ...INTRO_EASE,
                delay: spread ? 0.05 + index * 0.04 : 0
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
        <Tag
          className="yy-projects-card"
          data-tone={card.tone % 7}
          data-has-cover={card.coverSrc ? 'true' : 'false'}
          data-has-href={href ? 'true' : 'false'}
          href={href}
          {...(href
            ? {
                'aria-label': `${card.title} — ${card.scope}`
              }
            : { 'aria-hidden': true as const })}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          style={
            {
              width: `${faceWidth}px`,
              ['--sheen-angle' as string]: `${125 + (index - 2) * 18}deg`,
              ['--sheen-x' as string]: `${50 + (index - 2) * 14}%`
            } as CSSProperties
          }
        >
          <div className="yy-projects-card__plate">
            {card.coverSrc ? (
              <img
                className="yy-projects-card__cover"
                src={card.coverSrc}
                alt=""
                draggable={false}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
          <div className="yy-projects-card__glass" aria-hidden="true" />
          <div className="yy-projects-card__meta">
            <span className="yy-projects-card__title">{card.title}</span>
            <span className="yy-projects-card__scope">{card.scope}</span>
          </div>
        </Tag>
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

function ProjectsCarouselMotion({
  cards,
  embed = 'page'
}: {
  cards: ProjectsCarouselCard[];
  embed?: 'page' | 'panel';
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragArmed = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const movedPx = useRef(0);
  const baseYaw = useRef(0);
  const autoPhase = useRef(0);
  const autoPausedUntil = useRef(0);
  const autoWasPaused = useRef(false);
  const hoverPaused = useRef(false);
  const zoomIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  const pinchDist = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);

  const restLean = embed === 'panel' ? REST_LEAN_PANEL : REST_LEAN_PAGE;
  const arcStep = embed === 'panel' ? ARC_STEP_PANEL : ARC_STEP_PAGE;
  const zoomDefault =
    embed === 'panel' ? ZOOM_DEFAULT_PANEL : ZOOM_DEFAULT_PAGE;

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
    setSpread(false);
    setSettled(false);
    settledRef.current = false;
    // Hold face-on after fan-out before ambient spin.
    autoPausedUntil.current = performance.now() + 3200;
    const openTimer = window.setTimeout(() => setSpread(true), 140);
    const doneTimer = window.setTimeout(() => {
      setSettled(true);
      settledRef.current = true;
    }, 1500);
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  // Large faces — panel matches / exceeds prior page cylinder.
  const cylinderWidth = isScreenSizeSm
    ? embed === 'panel'
      ? 1720
      : 1880
    : embed === 'panel'
      ? 2920
      : 3120;
  const seatArc = (arcStep / 360) * cylinderWidth;
  const faceWidth = seatArc * FACE_GAP;
  const radius = cylinderWidth / (2 * Math.PI);

  const rotateY = useMotionValue(0);
  const rotateX = useMotionValue(restLean);
  const zoom = useMotionValue(zoomDefault);
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
      rotateX.set(
        clamp(rotateX.get(), restLean - ROTATE_X_SOFT, restLean + ROTATE_X_SOFT)
      );
      zoom.set(clamp(zoom.get(), ZOOM_MIN, ZOOM_MAX));
      return;
    }

    const pitch = rotateX.get();
    const pitchTarget =
      Math.abs(pitch - restLean) < 3
        ? restLean
        : clamp(pitch, restLean - ROTATE_X_SOFT, restLean + ROTATE_X_SOFT);
    void animate(rotateX, pitchTarget, SPRING_SNAP);

    const z = zoom.get();
    void animate(zoom, clamp(z, ZOOM_MIN, ZOOM_MAX), SPRING_SNAP);
  }, [restLean, rotateX, zoom]);

  const onHoverChange = useCallback((hovered: boolean) => {
    hoverPaused.current = hovered;
    if (hovered) {
      autoPausedUntil.current = Number.POSITIVE_INFINITY;
    } else {
      autoPausedUntil.current = performance.now() + 900;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragArmed.current = true;
      dragging.current = false;
      movedPx.current = 0;
      velocity.current = { x: 0, y: 0 };
      pointerStart.current = { x: event.clientX, y: event.clientY };
      lastPointer.current = { x: event.clientX, y: event.clientY };
      activePointerId.current = event.pointerId;
      autoPausedUntil.current = Number.POSITIVE_INFINITY;
    },
    []
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragArmed.current) return;
      if (
        activePointerId.current != null &&
        event.pointerId !== activePointerId.current
      ) {
        return;
      }

      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      const total = Math.hypot(
        event.clientX - pointerStart.current.x,
        event.clientY - pointerStart.current.y
      );
      movedPx.current = total;

      if (!dragging.current) {
        if (total < CLICK_DRAG_PX) return;
        dragging.current = true;
        stopOrbit();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }

      velocity.current = { x: dx, y: dy };
      rotateY.set(rotateY.get() + dx * DRAG_YAW);

      const nextPitch = rubberBand(
        rotateX.get() - dy * DRAG_PITCH,
        restLean - ROTATE_X_SOFT,
        restLean + ROTATE_X_SOFT
      );
      rotateX.set(
        clamp(nextPitch, restLean - ROTATE_X_HARD, restLean + ROTATE_X_HARD)
      );

      if (Math.abs(dy) > Math.abs(dx) * 0.55) {
        const zNext = rubberBand(
          zoom.get() - dy * 0.0026,
          ZOOM_MIN,
          ZOOM_MAX
        );
        zoom.set(clamp(zNext, ZOOM_SOFT_MIN, ZOOM_SOFT_MAX));
      }

      baseYaw.current = rotateY.get();
      autoPhase.current = 0;
    },
    [restLean, rotateX, rotateY, stopOrbit, zoom]
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragArmed.current) return;
      dragArmed.current = false;
      const wasDragging = dragging.current;
      dragging.current = false;
      activePointerId.current = null;

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* already released */
      }

      autoPausedUntil.current = performance.now() + 1200;

      if (!wasDragging) {
        // Tap: allow native <a> navigation (do not preventDefault).
        baseYaw.current = rotateY.get();
        autoPhase.current = 0;
        return;
      }

      if (prefersReducedMotion()) {
        baseYaw.current = rotateY.get();
        autoPhase.current = 0;
        settleElastic();
        return;
      }

      const coastY = rotateY.get() + velocity.current.x * DRAG_YAW * 7;
      baseYaw.current = coastY;
      autoPhase.current = 0;
      void animate(rotateY, coastY, SPRING);
      settleElastic();
    },
    [rotateY, settleElastic]
  );

  const onCardClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // If the gesture was an orbit drag, block link navigation.
      if (movedPx.current >= CLICK_DRAG_PX) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    []
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
        dragArmed.current ||
        hoverPaused.current ||
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
        autoPhase.current += dt * AUTO_SPIN;
        rotateY.set(baseYaw.current + autoPhase.current);
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

    const applyYawDelta = (delta: number) => {
      stopOrbit();
      autoPausedUntil.current = performance.now() + 1100;
      const next = rotateY.get() + delta;
      rotateY.set(next);
      baseYaw.current = next;
      autoPhase.current = 0;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);

      // Horizontal scroll / shift+wheel → yaw the drum.
      if (event.shiftKey || absX > absY) {
        const yawDelta = event.shiftKey
          ? (event.deltaY + event.deltaX) * WHEEL_YAW
          : event.deltaX * WHEEL_YAW;
        applyYawDelta(yawDelta);
        return;
      }

      if (event.ctrlKey) {
        applyZoomDelta(event.deltaY * WHEEL_ZOOM);
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
      data-embed={embed}
      data-slots={SLOT_COUNT}
      data-visible={visibleCards.length}
      data-spread={spread ? 'true' : 'false'}
      data-settled={settled ? 'true' : 'false'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onClickCapture={onCardClickCapture}
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
              arcStep={arcStep}
              spread={spread}
              settled={settled}
              onHoverChange={onHoverChange}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function ProjectsCarousel3D({
  cards,
  embed = 'page',
  introKey = 0
}: {
  cards: ProjectsCarouselCard[];
  /** page = full hub; panel = nav Work popup */
  embed?: 'page' | 'panel';
  /** Bump to replay fan-out entrance (Work reopen). */
  introKey?: number;
}) {
  if (!cards.length) return null;
  return (
    <ProjectsCarouselMotion
      key={introKey}
      cards={cards}
      embed={embed}
    />
  );
}

export default ProjectsCarousel3D;
