"use client";
import { useEffect, useRef } from "react";

export default function CTA() {
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
    <section id="cta" ref={ref} className="px-12 py-40 text-center">
      {/* Label */}
      <div className="reveal flex items-center justify-center gap-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-ink3 mb-4 before:content-[''] before:block before:w-4 before:h-px before:bg-ink3">
        Get early access
      </div>

      {/* Title */}
      <h2 className="reveal text-[clamp(32px,4vw,56px)] font-extrabold tracking-[-0.03em] leading-[1.05] text-ink mb-5 [&_em]:italic [&_em]:font-serif [&_em]:font-normal">
        Ready to think in<br /><em>systems?</em>
      </h2>

      <p className="reveal text-[13px] font-light text-ink3 mb-10 leading-[1.8]">
        Join engineers already on the waitlist.
      </p>

      {/* Email input row */}
      <div className="reveal flex max-w-100 mx-auto border-2 border-ink rounded-sm overflow-hidden">
        <input
          type="email"
          placeholder="your@email.com"
          className="flex-1 px-4 py-3.5 font-mono text-[12px] bg-transparent border-none outline-none text-ink placeholder:text-ink3"
        />
        <button className="font-mono text-[11px] font-bold tracking-[0.08em] uppercase px-5 py-3.5 bg-ink text-bg border-none cursor-pointer hover:opacity-85 transition-opacity duration-200">
          Join →
        </button>
      </div>
    </section>
  );
}
