import { motion, useReducedMotion, type Transition } from 'motion/react';
import { type ElementType, useMemo } from 'react';
import { islandTiming } from '../../data/motion';

export type TextGenerateEffectProps = {
  children: string;
  as?: ElementType;
  className?: string;
  wordClassName?: string;
  trigger?: boolean;
  staggerDuration?: number;
  transition?: Transition;
  filter?: boolean;
  srOnly?: boolean;
};

export function TextGenerateEffect({
  children,
  as = 'p',
  className,
  wordClassName,
  trigger = true,
  staggerDuration = islandTiming.textGenerateStagger,
  transition = { duration: islandTiming.textGenerateDuration },
  filter = true,
  srOnly = true
}: TextGenerateEffectProps) {
  const words = useMemo(() => children.split(' '), [children]);
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;
  const reduced = useReducedMotion();
  const instant = Boolean(reduced);
  const live = trigger;
  const useFilter = instant ? false : filter;
  const delayStep = instant ? 0 : staggerDuration;

  return (
    <MotionTag aria-label={srOnly ? children : undefined} className={['text-generate', className].filter(Boolean).join(' ')}>
      {srOnly && <span className="sr-only">{children}</span>}
      {words.map((word, i) => (
        <motion.span
          animate={
            live
              ? { filter: useFilter ? 'blur(0px)' : undefined, opacity: 1 }
              : { filter: useFilter ? 'blur(4px)' : undefined, opacity: 0 }
          }
          aria-hidden="true"
          className={['text-generate__word', wordClassName].filter(Boolean).join(' ')}
          initial={{ filter: useFilter ? 'blur(4px)' : undefined, opacity: 0 }}
          key={`${i}-${word}`}
          /* Stagger on enter only — exit fades together so hover-out feels instant. */
          transition={{
            ...transition,
            duration: instant ? 0 : transition.duration,
            delay: live ? i * delayStep : 0
          }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </MotionTag>
  );
}

export default TextGenerateEffect;
