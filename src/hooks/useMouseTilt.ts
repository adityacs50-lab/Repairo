"use client";

import { useEffect, useState, RefObject } from "react";

interface MouseTiltValues {
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
}

export function useMouseTilt(
  ref: RefObject<HTMLElement | null>,
  maxRotation: number = 6,
  maxTranslation: number = 4
): MouseTiltValues {
  const [tilt, setTilt] = useState<MouseTiltValues>({
    rotateX: 0,
    rotateY: 0,
    translateX: 0,
    translateY: 0,
  });

  useEffect(() => {
    // Disable on mobile/touch devices
    if (typeof window === "undefined" || window.innerWidth < 1024) return;

    const element = ref.current;
    if (!element) return;

    let frameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      frameId = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) / (rect.width / 2);
        const deltaY = (e.clientY - centerY) / (rect.height / 2);

        // Clamp between -1 and 1
        const clampedX = Math.max(-1, Math.min(1, deltaX));
        const clampedY = Math.max(-1, Math.min(1, deltaY));

        setTilt({
          rotateY: clampedX * maxRotation,
          rotateX: -clampedY * maxRotation,
          translateX: clampedX * maxTranslation,
          translateY: clampedY * maxTranslation,
        });
      });
    };

    const handleMouseLeave = () => {
      setTilt({ rotateX: 0, rotateY: 0, translateX: 0, translateY: 0 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [ref, maxRotation, maxTranslation]);

  return tilt;
}
