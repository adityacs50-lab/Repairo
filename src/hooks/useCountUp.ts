"use client";

import { useEffect, useState } from "react";

export function useCountUp(end: number, duration: number = 1000, start: number = 0): number {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuad easing
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(start + easeProgress * (end - start)));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration, start]);

  return count;
}
