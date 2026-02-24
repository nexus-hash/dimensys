"use client";
import { useEffect, useRef } from "react";

const cards = [
  {
    num: "01",
    icon: "⤵",
    title: "Scroll to Learn",
    desc: "A cinematic scroll-driven narrative walks you through every scenario — cache miss, DB write, replication lag — step by step. The 3D model animates as you read.",
  },
  {
    num: "02",
    icon: "⊕",
    title: "Click to Explore",
    desc: "Click any component in the scene to inspect its internals — endpoint contracts, storage schema, caching strategy, replication config. No hand-waving.",
  },
  {
    num: "03",
    icon: "⚡",
    title: "Load to Stress Test",
    desc: "Pick a traffic preset — 1K, 10K, or 100K RPS — and watch the system react. Queues back up, caches saturate, DBs strain. See where it breaks.",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="how"
      ref={ref}
      className="px-12 py-30 bg-bg2 border-t border-b border-(--border)"
    >
      {/* Section label */}
      <div className="reveal flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-ink3 mb-4 before:content-[''] before:block before:w-4 before:h-px before:bg-ink3">
        How it works
      </div>

      {/* Title */}
      <h2 className="reveal text-[clamp(26px,3vw,42px)] font-extrabold tracking-[-0.025em] leading-[1.05] text-ink mb-14 [&_em]:italic [&_em]:font-serif [&_em]:font-normal">
        Three ways to <em>understand</em><br />any system
      </h2>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-0.5">
        {cards.map((card, i) => (
          <div
            key={card.num}
            data-num={card.num}
            className="reveal group relative p-12 bg-bg2 border border-(--border) overflow-hidden hover:bg-card-bg transition-colors duration-300"
            style={{ transitionDelay: `${i * 0.1}s` }}
          >
            {/* Big number watermark */}
            <span
              className="absolute -top-2.5 right-6 text-[120px] font-extrabold leading-none pointer-events-none select-none text-(--border) group-hover:text-(--glow) transition-colors duration-300"
              aria-hidden
            >
              {card.num}
            </span>

            {/* Icon */}
            <div className="w-10 h-10 border border-(--border) rounded mb-7 flex items-center justify-center text-base group-hover:border-ink transition-colors duration-300">
              {card.icon}
            </div>

            <div className="text-[13px] font-bold tracking-[-0.01em] mb-3 text-ink">
              {card.title}
            </div>
            <p className="text-[12px] font-light leading-[1.8] text-ink3">
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
