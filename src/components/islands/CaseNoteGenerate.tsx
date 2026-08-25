import { useEffect, useRef, useState } from 'react';
import TextGenerateEffect from './TextGenerateEffect';

interface Props {
  text: string;
}

/** Case note: TextGenerateEffect in/out synced to parent `.case` hover. */
export default function CaseNoteGenerate({ text }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    const caseEl = wrapRef.current?.closest('.case');
    if (!caseEl) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onEnter = () => setTrigger(true);
    const onLeave = () => setTrigger(false);

    caseEl.addEventListener('pointerenter', onEnter);
    caseEl.addEventListener('pointerleave', onLeave);

    if (reduced.matches && caseEl.matches(':hover')) setTrigger(true);

    return () => {
      caseEl.removeEventListener('pointerenter', onEnter);
      caseEl.removeEventListener('pointerleave', onLeave);
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
