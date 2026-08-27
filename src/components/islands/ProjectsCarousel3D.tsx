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
 * Open arc from an 8-slot ring — show 5 front seats, back empty.
 * No cylinder auto-spin; per-card left/right sway. Scroll snaps selection.
 */
const SLOT_COUNT = 8;
const VISIBLE_CARDS = 5;
/** Tight seat spacing so all 5 stay in the first-look FOV. */
const ARC_STEP_PAGE = 26;
const ARC_STEP_PANEL = 24;
const FACE_GAP = 0.78;
const DRAG_YAW = 0.32;
const DRAG_PITCH = 0.2;
const WHEEL_ZOOM = 0.0024;
const WHEEL_SELECT = 0.018;
const ROTATE_X_SOFT = 18;
const ROTATE_X_HARD = 32;
const REST_LEAN_PAGE = 2;
const REST_LEAN_PANEL = 0;
const ZOOM_MIN = 0.72;
const ZOOM_MAX = 1.45;
const ZOOM_SOFT_MIN = 0.62;
const ZOOM_SOFT_MAX = 1.55;
const ZOOM_DEFAULT_PANEL = 0.92;
const ZOOM_DEFAULT_PAGE = 0.9;
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

/** Cylinder yaw that centers seat `index`. */
function yawForIndex(index: number, step: number): number {
  return -faceAngle(index, step);
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Which of the 5 seats is closest to camera-forward given cylinder yaw. */
function nearestIndex(yaw: number, step: number, count: number): number {
  let best = 0;
  let bestAbs = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const world = Math.abs(normalizeDeg(yaw + faceAngle(i, step)));
    if (world < bestAbs) {
      bestAbs = world;
      best = i;
    }
  }
  return best;
}

function depthScale(index: number, step: number): number {
  const t = Math.abs(faceAngle(index, step)) / 90;
  return clamp(1.02 - t * 0.18, 0.82, 1.02);
}

function depthOpacity(index: number, step: number): number {
  const t = Math.abs(faceAngle(index, step)) / 90;
  return clamp(1 - t * 0.14, 0.86, 1);
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
  selected,
  onHoverChange,
  onSelect
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceWidth: number;
  radius: number;
  arcStep: number;
  spread: boolean;
  settled: boolean;
  selected: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: (index: number) => void;
}) {
  const reduced = prefersReducedMotion();
  const from = introTransform(index, radius, arcStep);
  const to = openTransform(index, radius, arcStep);
  const swayDelay = `${index * 0.35}s`;
  const opacity = depthOpacity(index, arcStep);
  const href = card.href || undefined;
  const Tag = href ? 'a' : 'div';

  return (
    <motion.div
      className="yy-projects-card-slot"
      data-selected={selected ? 'true' : 'false'}
      style={{
        width: `${faceWidth}px`,
        transformStyle: 'preserve-3d',
        zIndex: selected ? 3 : 1
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
            ? 'yy-projects-card-float is-swaying'
            : 'yy-projects-card-float'
        }
        style={{ animationDelay: swayDelay }}
      >
        <Tag
          className="yy-projects-card"
          data-tone={card.tone % 7}
          data-has-cover={card.coverSrc ? 'true' : 'false'}
          data-has-href={href ? 'true' : 'false'}
          data-selected={selected ? 'true' : 'false'}
          href={href}
          {...(href
            ? {
                'aria-label': `${card.title} — ${card.scope}`,
                'aria-current': selected ? ('true' as const) : undefined
              }
            : { 'aria-hidden': true as const })}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => {
            onHoverChange(true);
            onSelect(index);
          }}
          onBlur={() => onHoverChange(false)}
          onPointerDown={() => onSelect(index)}
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
            ? 'yy-projects-card-shadow is-swaying'
            : 'yy-projects-card-shadow'
        }
        style={{
          width: `${faceWidth * 0.78}px`,
          animationDelay: swayDelay
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
  const zoomIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  const pinchDist = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const wheelSelectAccum = useRef(0);

  const restLean = embed === 'panel' ? REST_LEAN_PANEL : REST_LEAN_PAGE;
  const arcStep = embed === 'panel' ? ARC_STEP_PANEL : ARC_STEP_PAGE;
  const zoomDefault =
    embed === 'panel' ? ZOOM_DEFAULT_PANEL : ZOOM_DEFAULT_PAGE;

  const midIndex = Math.floor((VISIBLE_CARDS - 1) / 2);
  const [spread, setSpread] = useState(() => prefersReducedMotion());
  const [settled, setSettled] = useState(() => prefersReducedMotion());
  const [selectedIndex, setSelectedIndex] = useState(midIndex);
  const selectedRef = useRef(selectedIndex);
  selectedRef.current = selectedIndex;
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
  // Moderate cylinder so five seats fit the viewport without dominating it.
  const cylinderWidth = isScreenSizeSm
    ? embed === 'panel'
      ? 1280
      : 1420
    : embed === 'panel'
      ? 2100
      : 2280;
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

  const snapToIndex = useCallback(
    (index: number, spring = true) => {
      const next = clamp(index, 0, visibleCards.length - 1);
      setSelectedIndex(next);
      selectedRef.current = next;
      const target = yawForIndex(next, arcStep);
      if (prefersReducedMotion() || !spring) {
        rotateY.set(target);
        return;
      }
      void animate(rotateY, target, SPRING_SNAP);
    },
    [arcStep, rotateY, visibleCards.length]
  );

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

  const snapSelectionFromYaw = useCallback(() => {
    const idx = nearestIndex(
      rotateY.get(),
      arcStep,
      visibleCards.length
    );
    snapToIndex(idx);
  }, [arcStep, rotateY, snapToIndex, visibleCards.length]);

  const onHoverChange = useCallback((_hovered: boolean) => {
    /* sway continues; selection is scroll/drag driven */
  }, []);

  const onSelect = useCallback(
    (index: number) => {
      snapToIndex(index);
    },
    [snapToIndex]
  );

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

      // Live-update which seat is centered while dragging.
      const live = nearestIndex(
        rotateY.get(),
        arcStep,
        visibleCards.length
      );
      if (live !== selectedRef.current) {
        selectedRef.current = live;
        setSelectedIndex(live);
      }
    },
    [
      arcStep,
      restLean,
      rotateX,
      rotateY,
      stopOrbit,
      visibleCards.length,
      zoom
    ]
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

      if (!wasDragging) {
        return;
      }

      if (prefersReducedMotion()) {
        snapSelectionFromYaw();
        settleElastic();
        return;
      }

      const coastY = rotateY.get() + velocity.current.x * DRAG_YAW * 5;
      rotateY.set(coastY);
      const idx = nearestIndex(coastY, arcStep, visibleCards.length);
      snapToIndex(idx);
      settleElastic();
    },
    [
      arcStep,
      rotateY,
      settleElastic,
      snapSelectionFromYaw,
      snapToIndex,
      visibleCards.length
    ]
  );

  const onCardClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (movedPx.current >= CLICK_DRAG_PX) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    []
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const applyZoomDelta = (delta: number) => {
      stopOrbit();
      const zNext = rubberBand(zoom.get() - delta, ZOOM_MIN, ZOOM_MAX);
      zoom.set(clamp(zNext, ZOOM_SOFT_MIN, ZOOM_SOFT_MAX));
      if (zoomIdle.current) clearTimeout(zoomIdle.current);
      zoomIdle.current = setTimeout(() => {
        settleElastic();
      }, 140);
    };

    const applySelectDelta = (delta: number) => {
      wheelSelectAccum.current += delta * WHEEL_SELECT;
      if (Math.abs(wheelSelectAccum.current) < 1) return;
      const step = wheelSelectAccum.current > 0 ? 1 : -1;
      wheelSelectAccum.current = 0;
      // Scroll right / down → next card (cylinder turns left).
      snapToIndex(selectedRef.current + step);
      if (selectIdle.current) clearTimeout(selectIdle.current);
      selectIdle.current = setTimeout(() => {
        settleElastic();
      }, 120);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);

      // Pinch-zoom (ctrl+wheel) keeps zoom.
      if (event.ctrlKey) {
        applyZoomDelta(event.deltaY * WHEEL_ZOOM);
        return;
      }

      // Horizontal or vertical scroll → select / snap a card.
      const selectDelta = absX > absY ? event.deltaX : event.deltaY;
      applySelectDelta(selectDelta);
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
      if (selectIdle.current) clearTimeout(selectIdle.current);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [settleElastic, snapToIndex, stopOrbit, zoom]);

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
      data-selected={selectedIndex}
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
              selected={index === selectedIndex}
              onHoverChange={onHoverChange}
              onSelect={onSelect}
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
