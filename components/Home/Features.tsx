"use client";
import { useEffect, useRef } from "react";

const features = [
  {
    num: "01",
    title: "Scroll-driven narrative",
    desc: "Every HLD problem is a story. Each scroll segment triggers an animated scenario — watch the system react, not just read about it.",
  },
  {
    num: "02",
    title: "Globe-level geo-distribution",
    desc: "For geo-distributed systems, see actual datacenter placement on a 3D earth. Select a region, fire a request, watch latency and replication in real time.",
  },
  {
    num: "03",
    title: "Component drill-down",
    desc: "Click any box in the scene — load balancer, cache, primary DB — and inspect its endpoints, eviction policy, consistency model, and config.",
  },
  {
    num: "04",
    title: "RPS stress testing",
    desc: "Choose 1K, 10K, or 100K requests/sec presets and watch the architecture respond. See which components bottleneck first.",
  },
];

export default function Features() {
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
      id="feature"
      ref={ref}
      className="px-12 py-30 bg-ink text-bg"
    >
      {/* Label */}
      <div className="reveal flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-[rgba(242,240,235,0.4)] mb-4 before:block before:w-4 before:h-px before:bg-[rgba(242,240,235,0.3)]">
        Why SysViz
      </div>

      {/* Title */}
      <h2 className="reveal text-[clamp(26px,3vw,42px)] font-extrabold tracking-[-0.025em] leading-[1.05] text-bg mb-14 max-w-135 [&_em]:italic [&_em]:font-serif [&_em]:font-normal">
        Built for engineers who think in <em>systems</em>
      </h2>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-0.5 border border-[rgba(242,240,235,0.1)]">
        {features.map((f, i) => (
          <div
            key={f.num}
            className="reveal p-10 border border-[rgba(242,240,235,0.08)] hover:bg-[rgba(242,240,235,0.04)] transition-colors duration-300"
            style={{ transitionDelay: `${i * 0.1}s` }}
          >
            <div className="text-[10px] font-semibold tracking-[0.2em] text-[rgba(242,240,235,0.3)] mb-5">
              {f.num}
            </div>
            <div className="text-sm font-bold text-[rgba(242,240,235,0.9)] mb-2.5 tracking-[-0.01em]">
              {f.title}
            </div>
            <p className="text-[11px] font-light leading-[1.8] text-[rgba(242,240,235,0.4)]">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
