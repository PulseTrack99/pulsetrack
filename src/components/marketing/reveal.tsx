"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades content up as it enters the viewport. Content is visible from the
 * start for anyone without IntersectionObserver or with reduced motion on,
 * so nothing is ever gated behind the animation.
 */
export function Reveal({
  children,
  className = "",
  stagger = false,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  as?: "div" | "section" | "ul";
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal ${seen ? "in" : ""} ${stagger ? "stagger" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Applies the reveal transition to each child individually. */
export function RevealGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      el?.querySelectorAll(".reveal").forEach((c) => c.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    el.querySelectorAll(".reveal").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`stagger ${className}`}>
      {children}
    </div>
  );
}
