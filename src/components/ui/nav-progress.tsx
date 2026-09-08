"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin gradient bar pinned to the top of the viewport. It runs a short
 * indeterminate-style fill whenever the committed route changes, giving a
 * visible "the page moved" cue on top of route-level loading.tsx skeletons.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const first = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setVisible(true);
    setWidth(12);
    timers.current.push(setTimeout(() => setWidth(72), 60));
    timers.current.push(setTimeout(() => setWidth(100), 260));
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 520)
    );

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[100] h-[3px] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full origin-left transition-[width] duration-200 ease-out"
        style={{
          width: `${width}%`,
          backgroundImage: "var(--gradient-brand)",
          boxShadow: "0 0 10px 1px rgba(27,77,228,.55)",
        }}
      />
    </div>
  );
}
