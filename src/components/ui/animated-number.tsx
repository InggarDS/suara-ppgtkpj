"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

/**
 * Tweens between the previous and next integer instead of snapping — used for
 * vote counts on the share screen so a change reads as a smooth count-up
 * rather than a jarring jump. Purely a render of `value`; never mutates or
 * re-fetches anything.
 */
export function AnimatedNumber({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString("id-ID"));
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const controls = animate(motionValue, value, { duration: 0.6, ease: "easeOut" });
    prev.current = value;
    return () => controls.stop();
  }, [value, motionValue]);

  return (
    <motion.span className={className} style={style}>
      {rounded}
    </motion.span>
  );
}
