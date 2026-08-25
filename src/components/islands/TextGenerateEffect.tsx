import { motion, type Transition } from 'motion/react';
import { type ElementType, useMemo } from 'react';

export type TextGenerateEffectProps = {
  children: string;
  as?: ElementType;
  className?: string;
  wordClassName?: string;
  trigger?: boolean;
  staggerDuration?: number;
  transition?: Transition;
  filter?: boolean;
};

export function TextGenerateEffect({
  children,
  as = 'p',
  className,
  wordClassName,
  trigger = true,
  staggerDuration = 0.1,
  transition = { duration: 0.5 },
  filter = true
}: TextGenerateEffectProps) {
  const words = useMemo(() => children.split(' '), [children]);
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag aria-label={children} className={['text-generate', className].filter(Boolean).join(' ')}>
      <span className="sr-only">{children}</span>
      {words.map((word, i) => (
        <motion.span
          animate={
            trigger
              ? { filter: filter ? 'blur(0px)' : undefined, opacity: 1 }
              : { filter: filter ? 'blur(4px)' : undefined, opacity: 0 }
          }
          aria-hidden="true"
          className={['text-generate__word', wordClassName].filter(Boolean).join(' ')}
          initial={{ filter: filter ? 'blur(4px)' : undefined, opacity: 0 }}
          key={`${i}-${word}`}
          transition={{ ...transition, delay: i * staggerDuration }}
        >
          {word}{' '}
        </motion.span>
      ))}
    </MotionTag>
  );
}

export default TextGenerateEffect;
