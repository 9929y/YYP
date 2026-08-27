import { useEffect, useRef, useState } from 'react';
import TextGenerateEffect from './TextGenerateEffect';

interface Props {
  text: string;
}

/**
 * Case note: TextGenerateEffect blur→clear only while the case media (.slot)
 * is hovered on a fine pointer. Leaves fade out together (no exit stagger).
 * Desktop: positioned 24px under the centered title block.
 * Small screens: sits in the right column beside the title.
 * Does not run on scroll-into-view or on coarse/touch pointers.
 */
export default function CaseNoteGenerate({ text }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    const caseEl = wrapRef.current?.closest('.case');
    const slot = caseEl?.querySelector('.slot');
    if (!slot) return;

    const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onEnter = () => {
      if (hoverMq.matches) setTrigger(true);
    };
    const onLeave = () => setTrigger(false);

    const sync = () => {
      if (!hoverMq.matches) {
        setTrigger(false);
        return;
      }
      if (reduced.matches && slot.matches(':hover')) setTrigger(true);
    };

    slot.addEventListener('pointerenter', onEnter);
    slot.addEventListener('pointerleave', onLeave);
    hoverMq.addEventListener('change', sync);
    sync();

    return () => {
      slot.removeEventListener('pointerenter', onEnter);
      slot.removeEventListener('pointerleave', onLeave);
      hoverMq.removeEventListener('change', sync);
    };
  }, []);

  return (
    <div className="case__note" ref={wrapRef}>
      <TextGenerateEffect
        as="p"
        className="case__note-generate"
        filter
        staggerDuration={0.06}
        transition={{ duration: 0.45 }}
        trigger={trigger}
      >
        {text}
      </TextGenerateEffect>
    </div>
  );
}
