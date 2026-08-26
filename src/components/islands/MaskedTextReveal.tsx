import {
  motion,
  useInView,
  useReducedMotion,
  type UseInViewOptions
} from 'motion/react';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type RefObject
} from 'react';

/*
 * Masked line/word reveal — the bleibtgleich.dev signature entrance.
 *
 * Motion SHAPE adapted from 21st.dev "Text Reveal (Mask)" by soralabs
 * (id 19257): each visual line sits in an `overflow: hidden` mask and its
 * content slides up from below (translateY 110% → 0), staggered per unit,
 * triggered when the block scrolls into view.
 *
 * Motion TIMING/EASING is deliberately NOT the source's 0.8s + expo-out. It is
 * this repo's own measured "text reveal" recipe — 500ms (--duration-very-slow)
 * on --ease-smooth-out cubic-bezier(.22,1,.36,1), 40–60ms stagger — so this new
 * effect reads as ONE system with yy-reveal.js rather than a second reveal with
 * its own cadence (see assets/css/yy-chrome.css §5 and src/data/motion.ts).
 *
 * Single-writer contract: this only ever writes `transform` on its own inner
 * `.mtr__inner` spans. It never touches `.rv` / `.yy-rv`, so it cannot fight the
 * existing reveal or IX2 over any property.
 *
 * Fail-safe: before hydration/measurement, and under prefers-reduced-motion, it
 * renders plain, fully visible text. JS off / hydration stalled / reduced motion
 * all end with readable content — the repo's hard rule.
 */

type SplitBy = 'lines' | 'words';

/** cubic-bezier(.22, 1, .36, 1) — identical to --ease-smooth-out. */
const EASE_SMOOTH_OUT = [0.22, 1, 0.36, 1] as const;

const SPLIT_DEFAULTS: Record<SplitBy, { duration: number; stagger: number }> = {
  lines: { duration: 0.5, stagger: 0.06 },
  words: { duration: 0.5, stagger: 0.04 }
};

const WHITESPACE_RE = /\s+/;

export interface MaskedTextRevealProps {
  /** Plain text to reveal. */
  text: string;
  /** Container tag. @default 'p' */
  as?: keyof React.JSX.IntrinsicElements;
  /** Line-by-line or word-by-word. @default 'lines' */
  splitBy?: SplitBy;
  /** Per-unit duration, seconds. Defaults to the repo's 500ms text-reveal. */
  duration?: number;
  /** Delay between successive units, seconds. */
  stagger?: number;
  /** Delay before the first unit, seconds. @default 0 */
  delay?: number;
  /** Initial vertical offset as a % of unit height. @default 110 */
  yPercent?: number;
  /** Animate only once. @default true */
  once?: boolean;
  /** Viewport margin for the in-view trigger. @default '0px 0px -12% 0px' */
  viewportMargin?: UseInViewOptions['margin'];
  /** Class applied to the semantic container (matches existing styles). */
  className?: string;
  /** id forwarded to the semantic container (e.g. for aria-labelledby). */
  id?: string;
}

type LineGroup = number[];

function groupWordsByLine(measureNode: HTMLElement): LineGroup[] {
  const measureWords = measureNode.querySelectorAll('[data-measure-word]');
  if (measureWords.length === 0) return [[0]];

  const groups: LineGroup[] = [];
  let current: LineGroup = [];
  let lastTop = -1;

  measureWords.forEach((node, index) => {
    const top = (node as HTMLElement).offsetTop;
    if (lastTop !== -1 && top > lastTop + 1) {
      groups.push(current);
      current = [];
    }
    current.push(index);
    lastTop = top;
  });

  if (current.length) groups.push(current);
  return groups.length ? groups : [[0]];
}

function useLineGroups(
  words: string[],
  className: string | undefined,
  rootRef: RefObject<HTMLDivElement | null>,
  measureRef: RefObject<HTMLDivElement | null>
) {
  const [lineGroups, setLineGroups] = useState<LineGroup[] | null>(null);
  const key = `${className ?? ''}:${words.join('\u0000')}`;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measureNode = measureRef.current;
    if (!root || !measureNode) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      /* The measure layer is absolutely stretched (left:0/right:0) inside .mtr
         and carries the same className, so max-width + typography match the real
         element and offsetTop grouping reflects the true line wrapping. */
      setLineGroups(groupWordsByLine(measureNode));
    };

    measure();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return lineGroups;
}

export function MaskedTextReveal({
  text,
  as: Tag = 'p',
  splitBy = 'lines',
  duration,
  stagger,
  delay = 0,
  yPercent = 110,
  once = true,
  viewportMargin = '0px 0px -12% 0px',
  className,
  id
}: MaskedTextRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(rootRef, { once, margin: viewportMargin });

  const words = useMemo(() => text.split(WHITESPACE_RE).filter(Boolean), [text]);
  const lineGroups = useLineGroups(words, className, rootRef, measureRef);

  const defaults = SPLIT_DEFAULTS[splitBy];
  const unitDuration = duration ?? defaults.duration;
  const unitStagger = stagger ?? defaults.stagger;

  const Component = Tag as ElementType;
  const hiddenY = `${yPercent}%`;
  const ready = lineGroups !== null && lineGroups.length > 0;
  const animate = isInView && ready && !prefersReducedMotion;

  /* Fail-safe path: reduced motion, empty, or not-yet-measured → plain text. */
  if (prefersReducedMotion || words.length === 0 || !ready) {
    return (
      <div className="mtr" ref={rootRef}>
        {/* Offscreen measure layer mirrors the real typography for line grouping. */}
        <div className={['mtr__measure', className].filter(Boolean).join(' ')} aria-hidden="true" ref={measureRef}>
          {words.map((word, i) => (
            <span className="mtr__word" data-measure-word key={`${i}-${word}`}>
              {word}
            </span>
          ))}
        </div>
        <Component className={className} id={id}>{text}</Component>
      </div>
    );
  }

  /* Per-line stagger index for word mode: count words across earlier lines. */
  const wordStagger = new Map<number, number>();
  let running = 0;
  for (const group of lineGroups) {
    for (const wordIndex of group) wordStagger.set(wordIndex, running++);
  }

  return (
    <div className="mtr" ref={rootRef}>
      <div className={['mtr__measure', className].filter(Boolean).join(' ')} aria-hidden="true" ref={measureRef}>
        {words.map((word, i) => (
          <span className="mtr__word" data-measure-word key={`${i}-${word}`}>
            {word}
          </span>
        ))}
      </div>
      <Component className={className} id={id}>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {lineGroups.map((group, lineIndex) => (
            <span className="mtr__line" key={lineIndex}>
              {splitBy === 'lines' ? (
                <motion.span
                  className="mtr__inner mtr__inner--block"
                  initial={{ y: hiddenY }}
                  animate={animate ? { y: '0%' } : { y: hiddenY }}
                  transition={{ duration: unitDuration, delay: delay + lineIndex * unitStagger, ease: EASE_SMOOTH_OUT }}
                >
                  {group.map((wordIndex) => (
                    <span className="mtr__word" key={wordIndex}>
                      {words[wordIndex]}
                    </span>
                  ))}
                </motion.span>
              ) : (
                group.map((wordIndex) => (
                  <motion.span
                    className="mtr__inner mtr__word"
                    key={wordIndex}
                    initial={{ y: hiddenY }}
                    animate={animate ? { y: '0%' } : { y: hiddenY }}
                    transition={{
                      duration: unitDuration,
                      delay: delay + (wordStagger.get(wordIndex) ?? 0) * unitStagger,
                      ease: EASE_SMOOTH_OUT
                    }}
                  >
                    {words[wordIndex]}
                  </motion.span>
                ))
              )}
            </span>
          ))}
        </span>
      </Component>
    </div>
  );
}

export default MaskedTextReveal;
