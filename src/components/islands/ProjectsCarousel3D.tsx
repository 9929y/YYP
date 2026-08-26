import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform
} from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties
} from 'react';
import { MotionGate } from './MotionGate';

export type ProjectsCarouselCard = {
  id: string;
  title: string;
  scope: string;
  pathLabel: string;
  imageSrc: string;
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
 * Remnant cylinder (front arc) with snap-to-center focus + bottom Anchor.
 * Drag/spring model follows the provided 3d-carousel.
 */
const ARC_DEG = 158;
const SCROLL_GAIN = 0.05;
const WHEEL_GAIN = 0.035;
const DRAG_GAIN = 0.05;
const IDLE_SNAP_MS = 120;
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

function staggerOffset(index: number): number {
  const magnitude = 8 + (index % 3) * 4; // 8 | 12 | 16
  return index % 2 === 0 ? magnitude : -magnitude;
}

function remnantStep(faceCount: number): number {
  if (faceCount <= 1) return 0;
  return ARC_DEG / (faceCount - 1);
}

function remnantAngle(index: number, faceCount: number): number {
  return -ARC_DEG / 2 + index * remnantStep(faceCount);
}

/** Rotation that places face `index` at world angle 0 (center). */
function rotationForIndex(index: number, faceCount: number): number {
  return -remnantAngle(index, faceCount);
}

function nearestIndex(rotationDeg: number, faceCount: number): number {
  if (faceCount <= 0) return 0;
  let best = 0;
  let bestAbs = Number.POSITIVE_INFINITY;
  for (let i = 0; i < faceCount; i++) {
    const world = remnantAngle(i, faceCount) + rotationDeg;
    const a = Math.abs(world);
    if (a < bestAbs) {
      bestAbs = a;
      best = i;
    }
  }
  return best;
}

function sideOpacity(index: number, focusedIndex: number, faceCount: number): number {
  if (faceCount <= 1) return 1;
  const step = remnantStep(faceCount);
  const dist = Math.abs(index - focusedIndex) * step;
  // ~0.55 at one step, ~0.35 at outer seats
  return Math.max(0.32, 0.92 - dist / 90);
}

function roundedRectPath(size: number, inset: number, radius: number): string {
  const x = inset;
  const y = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const r = Math.min(radius, w / 2, h / 2);
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z'
  ].join(' ');
}

function CardPathText({
  cardId,
  pathLabel,
  crawling
}: {
  cardId: string;
  pathLabel: string;
  crawling: boolean;
}) {
  const pathId = `yy-projects-path-${cardId}`;
  const d = roundedRectPath(100, 4, 9);
  const text = `${pathLabel}  ·  ${pathLabel}  ·  ${pathLabel}  ·  `;

  return (
    <svg
      className="yy-projects-card__path"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={pathId} d={d} fill="none" />
      </defs>
      <text className="yy-projects-card__path-text">
        <motion.textPath
          href={`#${pathId}`}
          xlinkHref={`#${pathId}`}
          animate={{ startOffset: crawling ? '0%' : '100%' }}
          initial={false}
          transition={
            crawling
              ? { duration: 5.5, ease: 'linear' }
              : { duration: 0.45, ease: [0.32, 0.72, 0, 1] }
          }
        >
          {text}
        </motion.textPath>
      </text>
    </svg>
  );
}

function CardFaceContent({
  card,
  focused,
  hovering,
  onHoverChange
}: {
  card: ProjectsCarouselCard;
  focused: boolean;
  hovering: boolean;
  onHoverChange: (next: boolean) => void;
}) {
  const showPath = hovering && focused;

  return (
    <div
      className="yy-projects-card__inner"
      data-focus={focused ? 'true' : undefined}
      data-hover={hovering ? 'true' : undefined}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <img
        className="yy-projects-card__media"
        src={card.imageSrc}
        alt=""
        draggable={false}
      />
      <div className="yy-projects-card__glass">
        {focused ? (
          <>
            <p className="yy-projects-card__name">{card.title}</p>
            <p className="yy-projects-card__scope">{card.scope}</p>
          </>
        ) : null}
      </div>
      {focused ? (
        <CardPathText cardId={card.id} pathLabel={card.pathLabel} crawling={showPath} />
      ) : null}
    </div>
  );
}

const CarouselFace = memo(function CarouselFace({
  card,
  index,
  faceCount,
  faceWidth,
  radius,
  focusedIndex,
  onSelect
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceCount: number;
  faceWidth: number;
  radius: number;
  focusedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const staggerX = staggerOffset(index);
  const focused = index === focusedIndex;
  const angle = remnantAngle(index, faceCount);
  const opacity = sideOpacity(index, focusedIndex, faceCount);

  const slotStyle: CSSProperties = {
    width: `${faceWidth}px`,
    transform: `rotateY(${angle}deg) translateZ(${radius}px) translateX(${staggerX}px)`
  };

  return (
    <div className="yy-projects-card-slot" style={slotStyle}>
      <motion.button
        type="button"
        className="yy-projects-card"
        data-focus={focused ? 'true' : undefined}
        style={{
          width: `${faceWidth}px`,
          opacity,
          scale: focused ? 1.06 : 1
        }}
        onClick={() => onSelect(index)}
        aria-current={focused ? 'true' : undefined}
        aria-label={card.title}
      >
        <CardFaceContent
          card={card}
          focused={focused}
          hovering={hovering}
          onHoverChange={setHovering}
        />
      </motion.button>
    </div>
  );
});

function CarouselAnchor({
  cards,
  focusedIndex,
  onSelect
}: {
  cards: ProjectsCarouselCard[];
  focusedIndex: number;
  onSelect: (index: number) => void;
}) {
  const focused = cards[focusedIndex] ?? cards[0];
  if (!focused) return null;

  return (
    <div className="yy-projects-anchor">
      <div className="yy-projects-anchor__tick" aria-hidden="true" />
      <div className="yy-projects-anchor__dots" role="tablist" aria-label="Projects">
        {cards.map((card, index) => {
          const active = index === focusedIndex;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              className="yy-projects-anchor__dot"
              aria-selected={active}
              aria-label={card.title}
              data-active={active ? 'true' : undefined}
              onClick={() => onSelect(index)}
            />
          );
        })}
      </div>
      <div className="yy-projects-anchor__readout" aria-live="polite">
        <p className="yy-projects-anchor__name">{focused.title}</p>
        <p className="yy-projects-anchor__scope">{focused.scope}</p>
      </div>
    </div>
  );
}

function ProjectsCarouselMotion({ cards }: { cards: ProjectsCarouselCard[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  const cylinderWidth = isScreenSizeSm ? 1100 : 1800;
  const faceCount = cards.length;
  const radius = cylinderWidth / (2 * Math.PI);
  const stepRad = (remnantStep(faceCount) * Math.PI) / 180;
  const faceWidth = Math.min(
    isScreenSizeSm ? 220 : 268,
    Math.max(160, 2 * radius * Math.sin(Math.max(stepRad, 0.01) / 2) * 1.92)
  );

  const initialIndex = Math.floor((faceCount - 1) / 2);
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);

  const rotation = useMotionValue(rotationForIndex(initialIndex, faceCount));
  const transform = useTransform(
    rotation,
    (value) => `rotate3d(0, 1, 0, ${value}deg)`
  );

  const syncFocusFromRotation = useCallback(
    (value: number) => {
      setFocusedIndex(nearestIndex(value, faceCount));
    },
    [faceCount]
  );

  useMotionValueEvent(rotation, 'change', syncFocusFromRotation);

  const snapToIndex = useCallback(
    (index: number, spring = true) => {
      const clamped = Math.max(0, Math.min(faceCount - 1, index));
      const target = rotationForIndex(clamped, faceCount);
      setFocusedIndex(clamped);
      rotation.stop();
      if (!spring || prefersReducedMotion()) {
        rotation.set(target);
        return;
      }
      void animate(rotation, target, SPRING);
    },
    [faceCount, rotation]
  );

  const snapToNearest = useCallback(() => {
    snapToIndex(nearestIndex(rotation.get(), faceCount));
  }, [faceCount, rotation, snapToIndex]);

  const scheduleIdleSnap = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (dragging.current) return;
      snapToNearest();
    }, IDLE_SNAP_MS);
  }, [snapToNearest]);

  // Mount: ensure middle card is centered (already set on motion value).
  useEffect(() => {
    setFocusedIndex(initialIndex);
    rotation.set(rotationForIndex(initialIndex, faceCount));
  }, [faceCount, initialIndex, rotation]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.15, rootMargin: '0px' }
    );
    io.observe(stage);

    let lastY = window.scrollY || window.pageYOffset || 0;

    const nudge = (delta: number) => {
      if (!inView || Math.abs(delta) < 0.2) return;
      rotation.set(rotation.get() + delta);
      scheduleIdleSnap();
    };

    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const delta = y - lastY;
      lastY = y;
      nudge(delta * SCROLL_GAIN);
    };

    const onWheel = (event: WheelEvent) => {
      if (!inView) return;
      const capped =
        Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 48);
      nudge(capped * WHEEL_GAIN);
    };

    const onLenis = (event: Event) => {
      const detail = (event as CustomEvent<{ velocity?: number; scroll?: number }>)
        .detail;
      if (typeof detail?.velocity === 'number') {
        nudge(detail.velocity * 0.3);
        return;
      }
      if (typeof detail?.scroll === 'number') {
        const delta = detail.scroll - lastY;
        lastY = detail.scroll;
        nudge(delta * SCROLL_GAIN);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('lenis-scroll', onLenis as EventListener);
    document.addEventListener('lenis-scroll', onLenis as EventListener);

    return () => {
      io.disconnect();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('lenis-scroll', onLenis as EventListener);
      document.removeEventListener('lenis-scroll', onLenis as EventListener);
    };
  }, [rotation, scheduleIdleSnap]);

  return (
    <div
      ref={stageRef}
      className="yy-projects-carousel"
      data-testid="projects-carousel"
      data-face-count={faceCount}
      data-focused-index={focusedIndex}
    >
      <div className="yy-projects-carousel__stage">
        <motion.div
          className="yy-projects-carousel__cylinder"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.04}
          style={{
            transform,
            width: cylinderWidth,
            transformStyle: 'preserve-3d'
          }}
          onDragStart={() => {
            dragging.current = true;
            if (idleTimer.current) clearTimeout(idleTimer.current);
            rotation.stop();
            dragOrigin.current = rotation.get();
          }}
          onDrag={(_, info) => {
            rotation.set(dragOrigin.current + info.offset.x * DRAG_GAIN);
          }}
          onDragEnd={(_, info) => {
            dragging.current = false;
            const provisional = rotation.get() + info.velocity.x * DRAG_GAIN;
            const index = nearestIndex(provisional, faceCount);
            snapToIndex(index);
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
              focusedIndex={focusedIndex}
              onSelect={snapToIndex}
            />
          ))}
        </motion.div>
      </div>
      <CarouselAnchor
        cards={cards}
        focusedIndex={focusedIndex}
        onSelect={snapToIndex}
      />
    </div>
  );
}

function ProjectsCarouselStatic({ cards }: { cards: ProjectsCarouselCard[] }) {
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.floor((cards.length - 1) / 2)
  );
  const focused = cards[focusedIndex] ?? cards[0];

  return (
    <div
      className="yy-projects-carousel yy-projects-carousel--static"
      data-testid="projects-carousel-static"
    >
      <ul className="yy-projects-carousel__grid">
        {cards.map((card, index) => {
          const isFocus = index === focusedIndex;
          return (
            <li key={card.id} className="yy-projects-card-slot">
              <button
                type="button"
                className="yy-projects-card"
                data-static="true"
                data-focus={isFocus ? 'true' : undefined}
                aria-current={isFocus ? 'true' : undefined}
                aria-label={card.title}
                onClick={() => setFocusedIndex(index)}
              >
                <div className="yy-projects-card__inner" data-focus={isFocus ? 'true' : undefined}>
                  <img
                    className="yy-projects-card__media"
                    src={card.imageSrc}
                    alt=""
                    draggable={false}
                  />
                  <div className="yy-projects-card__glass">
                    {isFocus ? (
                      <>
                        <p className="yy-projects-card__name">{card.title}</p>
                        <p className="yy-projects-card__scope">{card.scope}</p>
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {focused ? (
        <div className="yy-projects-anchor">
          <div className="yy-projects-anchor__tick" aria-hidden="true" />
          <div className="yy-projects-anchor__dots" role="tablist" aria-label="Projects">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                className="yy-projects-anchor__dot"
                aria-selected={index === focusedIndex}
                aria-label={card.title}
                data-active={index === focusedIndex ? 'true' : undefined}
                onClick={() => setFocusedIndex(index)}
              />
            ))}
          </div>
          <div className="yy-projects-anchor__readout" aria-live="polite">
            <p className="yy-projects-anchor__name">{focused.title}</p>
            <p className="yy-projects-anchor__scope">{focused.scope}</p>
          </div>
        </div>
      ) : null}
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
