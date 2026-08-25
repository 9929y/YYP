import { useEffect, useState, type ReactNode } from 'react';

/**
 * React-island primitive for future motion widgets.
 * Renders children only when the reader has not asked for reduced motion.
 * Mount with `client:visible` (below-fold) or `client:load` (above-fold only).
 */
export function MotionGate({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAllow(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return <>{allow ? children : fallback}</>;
}
