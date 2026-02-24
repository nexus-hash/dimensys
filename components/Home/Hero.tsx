import HeroDiagram from "./HeroDiagram";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen grid grid-cols-2 items-center px-12 overflow-hidden"
    >
      {/* Left content */}
      <div className="pt-20 z-10">
        {/* Eyebrow */}
        <div className="flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-ink3 mb-6 animate-fade-up-d1">
          System design, redefined
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(36px,4.5vw,64px)] font-extrabold leading-none tracking-[-0.03em] text-ink mb-7 animate-fade-up-d2">
          Stop reading.<br />
          <em className="font-serif font-normal not-italic text-[clamp(40px,5vw,72px)] tracking-[-0.01em]">
            Start seeing
          </em>
          <br />
          systems.
        </h1>

        {/* Subtext */}
        <p className="text-[13px] font-light leading-[1.8] text-ink3 max-w-105 mb-10 animate-fade-up-d3">
          Scroll through{" "}
          <code className="font-mono text-[11px] bg-(--tag-bg) px-1.5 py-0.5 rounded-sm text-ink2">
            cache misses
          </code>
          , watch{" "}
          <code className="font-mono text-[11px] bg-(--tag-bg) px-1.5 py-0.5 rounded-sm text-ink2">
            geo-replication
          </code>{" "}
          in real time, stress-test with{" "}
          <code className="font-mono text-[11px] bg-(--tag-bg) px-1.5 py-0.5 rounded-sm text-ink2">
            10K RPS
          </code>{" "}
          — all in interactive 3D. HLD, LLD, DSA like you&apos;ve never learned them.
        </p>

        {/* CTA */}
        <div className="flex gap-3 items-center animate-fade-up-d4">
          <button className="font-mono text-[12px] font-bold tracking-[0.08em] uppercase px-7 py-3.5 bg-ink text-bg border-2 border-ink rounded-sm cursor-pointer hover:bg-transparent hover:text-ink transition-all duration-200">
            Explore TinyURL →
          </button>
          <button className="font-mono text-[11px] font-semibold tracking-[0.08em] uppercase px-7 py-3.5 bg-transparent text-ink3 border-2 border-(--border) rounded-sm cursor-pointer hover:border-ink hover:text-ink transition-all duration-200">
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div className="mt-14 flex gap-10 animate-fade-up-d5">
          {[
            { num: "12+", label: "HLD Problems" },
            { num: "3D",  label: "Visualizations" },
            { num: "∞",   label: "Scenarios" },
          ].map(({ num, label }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[22px] font-extrabold text-ink tracking-[-0.02em]">{num}</span>
              <span className="text-[10px] font-normal tracking-[0.12em] uppercase text-ink3">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diagram */}
      <HeroDiagram />

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-12 flex items-center gap-2.5 text-[10px] tracking-[0.15em] uppercase text-ink3 animate-fade-in-slow">
        <div className="w-8 h-px bg-ink3 animate-scroll-pulse" />
        Scroll to explore
      </div>
    </section>
  );
}
