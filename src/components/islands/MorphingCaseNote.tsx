import { useCallback, useEffect, useId, useRef } from 'react';

/*
 * Morph-in / morph-out for case notes — same Magic UI blur + SVG threshold
 * technique as MorphingStatement (Beyond / Toward).
 * https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/morphing-text.tsx
 */
const morphTime = 0.85;

interface Props {
  text: string;
}

export default function MorphingCaseNote({ text }: Props) {
  const reactId = useId().replace(/:/g, '');
  const filterId = `morph-note-${reactId}`;
  const wrapRef = useRef<HTMLSpanElement>(null);
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);
  const hoveredRef = useRef(false);
  const fractionRef = useRef(0);
  const lastRef = useRef(0);

  const paint = useCallback((fraction: number) => {
    const a = text1Ref.current;
    const b = text2Ref.current;
    if (!a || !b) return;

    const t = Math.max(0, Math.min(1, fraction));
    const inv = 1 - t;

    /* a = outgoing (blank), b = incoming (note) while revealing */
    a.textContent = '';
    b.textContent = text;

    if (t <= 0) {
      a.style.filter = 'none';
      a.style.opacity = '0%';
      b.style.filter = 'none';
      b.style.opacity = '0%';
      return;
    }

    if (t >= 1) {
      a.style.filter = 'none';
      a.style.opacity = '0%';
      b.style.filter = 'none';
      b.style.opacity = '100%';
      return;
    }

    b.style.filter = `blur(${Math.min(8 / t - 8, 100)}px)`;
    b.style.opacity = `${Math.pow(t, 0.4) * 100}%`;
    a.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`;
    a.style.opacity = `${Math.pow(inv, 0.4) * 100}%`;
  }, [text]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const caseEl = wrapRef.current?.closest('.case');
    if (!caseEl) return;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000 || 0);
      lastRef.current = now;

      const target = hoveredRef.current ? 1 : 0;
      const dir = target >= fractionRef.current ? 1 : -1;
      fractionRef.current = Math.max(
        0,
        Math.min(1, fractionRef.current + dir * (dt / morphTime))
      );
      paint(fractionRef.current);

      if (Math.abs(fractionRef.current - target) > 0.001) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fractionRef.current = target;
        paint(target);
        rafRef.current = 0;
      }
    };

    const start = () => {
      if (rafRef.current) return;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      hoveredRef.current = true;
      if (reduced.matches) {
        fractionRef.current = 1;
        paint(1);
        return;
      }
      start();
    };

    const onLeave = () => {
      hoveredRef.current = false;
      if (reduced.matches) {
        fractionRef.current = 0;
        paint(0);
        return;
      }
      start();
    };

    paint(0);
    caseEl.addEventListener('pointerenter', onEnter);
    caseEl.addEventListener('pointerleave', onLeave);

    return () => {
      caseEl.removeEventListener('pointerenter', onEnter);
      caseEl.removeEventListener('pointerleave', onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paint]);

  return (
    <span className="case__note morph-note" ref={wrapRef}>
      <span className="sr-only">{text}</span>
      <span className="morph-note__stage" aria-hidden="true" style={{ filter: `url(#${filterId}) blur(0.6px)` }}>
        <span className="morph-note__sizer">{text}</span>
        <span className="morph-note__text" ref={text1Ref} />
        <span className="morph-note__text" ref={text2Ref} />
      </span>
      <svg className="morph-note__filters" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </span>
  );
}
