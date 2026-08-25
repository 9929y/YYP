import { useCallback, useEffect, useRef } from 'react';

/*
 * Morph algorithm adapted directly from Magic UI's MIT-licensed Morphing Text:
 * https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/morphing-text.tsx
 *
 * Magic UI uses a 1.5s morph. The longer 1.8s cooldown below is the only timing
 * change, giving each statement enough time to be read before the next morph.
 */
const morphTime = 1.5;
const cooldownTime = 1.8;

const beyondWords = ['prompts,', 'outputs,', 'automation,'];
const towardWords = ['intent.', 'outcomes.', 'flow.'];

function useMorphingWords() {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(cooldownTime);
  const timeRef = useRef(new Date());
  const beyond1Ref = useRef<HTMLSpanElement>(null);
  const beyond2Ref = useRef<HTMLSpanElement>(null);
  const toward1Ref = useRef<HTMLSpanElement>(null);
  const toward2Ref = useRef<HTMLSpanElement>(null);

  const setPairStyles = useCallback(
    (
      current1: HTMLSpanElement | null,
      current2: HTMLSpanElement | null,
      texts: string[],
      fraction: number
    ) => {
      if (!current1 || !current2) return;

      current2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      current2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      const invertedFraction = 1 - fraction;
      current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
      current1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    },
    []
  );

  const setStyles = useCallback(
    (fraction: number) => {
      setPairStyles(beyond1Ref.current, beyond2Ref.current, beyondWords, fraction);
      setPairStyles(toward1Ref.current, toward2Ref.current, towardWords, fraction);
    },
    [setPairStyles]
  );

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current;
    cooldownRef.current = 0;

    let fraction = morphRef.current / morphTime;
    if (fraction > 1) {
      cooldownRef.current = cooldownTime;
      fraction = 1;
    }

    setStyles(fraction);
    if (fraction === 1) textIndexRef.current++;
  }, [setStyles]);

  const doCooldown = useCallback(() => {
    morphRef.current = 0;
    const resetPair = (
      current1: HTMLSpanElement | null,
      current2: HTMLSpanElement | null,
      texts: string[]
    ) => {
      if (!current1 || !current2) return;
      current1.textContent = texts[textIndexRef.current % texts.length];
      current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
      current2.style.filter = 'none';
      current2.style.opacity = '0%';
      current1.style.filter = 'none';
      current1.style.opacity = '100%';
    };

    resetPair(beyond1Ref.current, beyond2Ref.current, beyondWords);
    resetPair(toward1Ref.current, toward2Ref.current, towardWords);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      doCooldown();
      return;
    }

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime.getTime() - timeRef.current.getTime()) / 1000;
      timeRef.current = newTime;
      cooldownRef.current -= dt;

      if (cooldownRef.current <= 0) doMorph();
      else doCooldown();
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [doMorph, doCooldown]);

  return { beyond1Ref, beyond2Ref, toward1Ref, toward2Ref };
}

export default function MorphingStatement() {
  const { beyond1Ref, beyond2Ref, toward1Ref, toward2Ref } = useMorphingWords();
  const accessibleText = [
    'Build AI-native experiences beyond prompts, toward intent.',
    'Beyond outputs, toward outcomes.',
    'Beyond automation, toward flow.'
  ].join(' ');

  return (
    <>
      <span className="sr-only">{accessibleText}</span>
      <span className="morph-statement" aria-hidden="true">
        <span className="morph-statement__lead">Build AI-native experiences</span>
        <span className="morph-statement__line">
          <span>beyond</span>
          <span className="morph-statement__morph morph-statement__morph--beyond">
            <span className="morph-statement__text" ref={beyond1Ref} />
            <span className="morph-statement__text" ref={beyond2Ref} />
          </span>
        </span>
        <span className="morph-statement__line">
          <span>toward</span>
          <span className="morph-statement__morph morph-statement__morph--toward">
            <span className="morph-statement__text" ref={toward1Ref} />
            <span className="morph-statement__text" ref={toward2Ref} />
          </span>
        </span>
      </span>
      <svg className="morph-statement__filters" aria-hidden="true">
        <defs>
          <filter id="morph-threshold">
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
    </>
  );
}
