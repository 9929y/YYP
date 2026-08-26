import {
  animate,
  motion,
  useMotionValue,
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
 * Layout/drag model follows the provided 3d-carousel (motion cylinder + spring
 * settle). Faces are packed on a front remnant arc (not a closed 360° ring) so
 * ≥5 cards stay in view with 6–7 projects — matching the denser look of the
 * original demo (which used ~14 faces around a full cylinder).
 */
const ARC_DEG = 158;
const SCROLL_GAIN = 0.05;
const WHEEL_GAIN = 0.035;
const DRAG_GAIN = 0.05;

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
  active,
  hovering,
  onHoverChange
}: {
  card: ProjectsCarouselCard;
  active: boolean;
  hovering: boolean;
  onHoverChange: (next: boolean) => void;
}) {
  return (
    <div
      className="yy-projects-card__inner"
      data-active={active ? 'true' : undefined}
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
        <p className="yy-projects-card__name">{card.title}</p>
        <p className="yy-projects-card__scope">{card.scope}</p>
      </div>
      <CardPathText cardId={card.id} pathLabel={card.pathLabel} crawling={hovering} />
    </div>
  );
}

const CarouselFace = memo(function CarouselFace({
  card,
  index,
  faceCount,
  faceWidth,
  radius,
  activeId,
  onSelect
}: {
  card: ProjectsCarouselCard;
  index: number;
  faceCount: number;
  faceWidth: number;
  radius: number;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const staggerX = staggerOffset(index);
  const isActive = activeId === card.id;
  const angle = remnantAngle(index, faceCount);

  const slotStyle: CSSProperties = {
    width: `${faceWidth}px`,
    transform: `rotateY(${angle}deg) translateZ(${radius}px) translateX(${staggerX}px)`
  };

  return (
    <div className="yy-projects-card-slot" style={slotStyle}>
      <motion.button
        type="button"
        className="yy-projects-card"
        data-active={isActive ? 'true' : undefined}
        style={{
          width: `${faceWidth}px`,
          scale: isActive ? 1.04 : 1
        }}
        onClick={() => onSelect(card.id)}
        aria-pressed={isActive}
        aria-label={card.title}
      >
        <CardFaceContent
          card={card}
          active={isActive}
          hovering={hovering}
          onHoverChange={setHovering}
        />
      </motion.button>
    </div>
  );
});

function ProjectsCarouselMotion({ cards }: { cards: ProjectsCarouselCard[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isScreenSizeSm = useMediaQuery('(max-width: 640px)');
  // Same cylinder sizing approach as the provided 3d-carousel.
  const cylinderWidth = isScreenSizeSm ? 1100 : 1800;
  const faceCount = cards.length;
  // Remnant packs faces on ARC_DEG; size faces from chord length so ≥5 read clearly.
  const radius = cylinderWidth / (2 * Math.PI);
  const stepRad = (remnantStep(faceCount) * Math.PI) / 180;
  const faceWidth = Math.min(
    isScreenSizeSm ? 220 : 268,
    Math.max(160, 2 * radius * Math.sin(Math.max(stepRad, 0.01) / 2) * 1.92)
  );

  const rotation = useMotionValue(0);
  const transform = useTransform(
    rotation,
    (value) => `rotate3d(0, 1, 0, ${value}deg)`
  );

  const onSelect = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

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
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('lenis-scroll', onLenis as EventListener);
      document.removeEventListener('lenis-scroll', onLenis as EventListener);
    };
  }, [rotation]);

  return (
    <div
      ref={stageRef}
      className="yy-projects-carousel"
      data-testid="projects-carousel"
      data-face-count={faceCount}
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
            dragOrigin.current = rotation.get();
          }}
          onDrag={(_, info) => {
            // Same gain as the provided carousel; origin-anchored so offset does not compound.
            rotation.set(dragOrigin.current + info.offset.x * DRAG_GAIN);
          }}
          onDragEnd={(_, info) => {
            const target = rotation.get() + info.velocity.x * DRAG_GAIN;
            void animate(rotation, target, {
              type: 'spring',
              stiffness: 100,
              damping: 30,
              mass: 0.1
            });
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
              activeId={activeId}
              onSelect={onSelect}
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
            <div className="yy-projects-card" data-static="true">
              <div className="yy-projects-card__inner">
                <img
                  className="yy-projects-card__media"
                  src={card.imageSrc}
                  alt=""
                  draggable={false}
                />
                <div className="yy-projects-card__glass">
                  <p className="yy-projects-card__name">{card.title}</p>
                  <p className="yy-projects-card__scope">{card.scope}</p>
                </div>
                <svg
                  className="yy-projects-card__path yy-projects-card__path--static"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <path
                      id={`yy-projects-path-static-${card.id}`}
                      d={roundedRectPath(100, 4, 9)}
                      fill="none"
                    />
                  </defs>
                  <text className="yy-projects-card__path-text">
                    <textPath
                      href={`#yy-projects-path-static-${card.id}`}
                      xlinkHref={`#yy-projects-path-static-${card.id}`}
                      startOffset="0%"
                    >
                      {card.pathLabel}
                    </textPath>
                  </text>
                </svg>
              </div>
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
