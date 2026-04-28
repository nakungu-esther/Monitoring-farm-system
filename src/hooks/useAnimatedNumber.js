import { useState, useEffect, useRef } from 'react';

/**
 * Smoothly animates displayed number toward `value` (easing).
 */
export function useAnimatedNumber(value, durationMs = 850) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const t0 = performance.now();
    let id;

    const run = (t) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const e = 1 - (1 - p) * (1 - p);
      setDisplay(start + (end - start) * e);
      if (p < 1) {
        id = requestAnimationFrame(run);
      } else {
        prevRef.current = end;
      }
    };

    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [value, durationMs]);

  return display;
}
