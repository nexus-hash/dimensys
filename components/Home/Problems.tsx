"use client";
import { useEffect, useRef } from "react";

interface Tag { label: string; geo?: boolean }
interface Problem {
  name: string;
  desc: string;
  tags: Tag[];
  scenarios: number;
  Svg: () => React.ReactElement;
}

function TinyUrlSvg() {
  return (
    <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-[0.65]">
      <circle cx="40" cy="80" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="120" cy="40" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="120" cy="80" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <circle cx="120" cy="120" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="200" cy="60" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="200" cy="100" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="54" y1="75" x2="110" y2="45" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2s" repeatCount="indefinite" /></line>
      <line x1="54" y1="80" x2="110" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.7" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.4s" repeatCount="indefinite" /></line>
      <line x1="54" y1="85" x2="110" y2="115" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.5s" repeatCount="indefinite" /></line>
      <line x1="130" y1="43" x2="186" y2="62" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.8s" repeatCount="indefinite" /></line>
      <line x1="130" y1="117" x2="186" y2="98" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.2s" repeatCount="indefinite" /></line>
      <text x="28" y="83" fontFamily="monospace" fontSize="7" fill="currentColor" opacity="0.5">CLIENT</text>
      <text x="115" y="43" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">LB</text>
      <text x="114" y="83" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.7">API</text>
      <text x="115" y="123" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">LB</text>
      <text x="190" y="63" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">CACHE</text>
      <text x="194" y="103" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">DB</text>
    </svg>
  );
}

function QueueSvg() {
  return (
    <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-[0.65]">
      <rect x="20" y="65" width="36" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <rect x="80" y="50" width="36" height="60" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <rect x="140" y="45" width="36" height="70" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <rect x="200" y="65" width="24" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="56" y1="80" x2="80" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.6s" repeatCount="indefinite" /></line>
      <line x1="116" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.2s" repeatCount="indefinite" /></line>
      <line x1="176" y1="80" x2="200" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeDasharray="4 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2s" repeatCount="indefinite" /></line>
      <text x="22" y="83" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">USER</text>
      <text x="82" y="83" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.6">KAFKA</text>
      <text x="142" y="83" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">WORKER</text>
      <text x="201" y="83" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">DB</text>
    </svg>
  );
}

function HashingSvg() {
  return (
    <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-[0.65]">
      <circle cx="120" cy="80" r="50" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <circle cx="120" cy="80" r="30" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <circle cx="75" cy="60" r="8" fill="currentColor" opacity="0.6" />
      <circle cx="155" cy="55" r="8" fill="currentColor" opacity="0.6" />
      <circle cx="160" cy="105" r="8" fill="currentColor" opacity="0.6" />
      <circle cx="90" cy="120" r="8" fill="currentColor" opacity="0.6" />
      <circle cx="120" cy="80" r="5" fill="currentColor" opacity="0.9" />
      <line x1="120" y1="80" x2="75" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" /></line>
      <line x1="120" y1="80" x2="155" y2="55" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="2s" repeatCount="indefinite" /></line>
      <line x1="120" y1="80" x2="160" y2="105" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.8s" repeatCount="indefinite" /></line>
      <line x1="120" y1="80" x2="90" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="2.2s" repeatCount="indefinite" /></line>
      <text x="61" y="57" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">N1</text>
      <text x="159" y="52" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">N2</text>
      <text x="164" y="102" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">N3</text>
      <text x="74" y="132" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.5">N4</text>
      <text x="110" y="78" fontFamily="monospace" fontSize="6" fill="currentColor" opacity="0.8">COORD</text>
    </svg>
  );
}

const problems: Problem[] = [
  {
    name: "TinyURL",
    desc: "URL shortener at scale. Explore cache layers, hash collisions, and geo-distributed redirects.",
    tags: [{ label: "HLD" }, { label: "🌐 Geo", geo: true }, { label: "Caching" }],
    scenarios: 6,
    Svg: TinyUrlSvg,
  },
  {
    name: "Message Queue",
    desc: "Kafka internals, consumer groups, partition rebalancing, and dead letter queues visualized.",
    tags: [{ label: "HLD" }, { label: "Async" }, { label: "Streaming" }],
    scenarios: 5,
    Svg: QueueSvg,
  },
  {
    name: "Consistent Hashing",
    desc: "Virtual nodes, ring topology, and load redistribution when nodes join or leave the cluster.",
    tags: [{ label: "HLD" }, { label: "Distributed" }],
    scenarios: 4,
    Svg: HashingSvg,
  },
];

export default function Problems() {
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
    <section id="problems" ref={ref} className="px-12 py-30">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <div className="reveal flex items-center gap-2.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-ink3 mb-4 before:content-[''] before:block before:w-4 before:h-px before:bg-ink3">
            Problem library
          </div>
          <h2 className="reveal text-[clamp(26px,3vw,42px)] font-extrabold tracking-[-0.025em] leading-[1.05] text-ink [&_em]:italic [&_em]:font-serif [&_em]:font-normal">
            Start with the <em>classics</em>
          </h2>
        </div>
        <a
          href="#"
          className="reveal text-[11px] font-semibold tracking-widest uppercase text-ink3 no-underline border-b border-(--border) pb-0.5 hover:text-ink hover:border-ink transition-all duration-200"
        >
          View all problems →
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {problems.map((p, i) => (
          <div
            key={p.name}
            className="reveal group border border-(--border) rounded overflow-hidden cursor-pointer bg-card-bg hover:-translate-y-1 hover:border-ink2 hover:shadow-glow transition-all duration-200"
            style={{ transitionDelay: `${i * 0.1}s` }}
          >
            {/* Visual */}
            <div className="h-40 bg-bg2 border-b border-(--border) flex items-center justify-center overflow-hidden">
              <p.Svg />
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="flex gap-1.5 flex-wrap mb-3">
                {p.tags.map((t) => (
                  <span
                    key={t.label}
                    className={[
                      "text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded-sm",
                      t.geo
                        ? "bg-(--tag-bg) text-ink2"
                        : "bg-(--tag-bg) text-ink3",
                    ].join(" ")}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="text-[15px] font-extrabold tracking-[-0.02em] mb-2 text-ink">
                {p.name}
              </div>
              <p className="text-[11px] font-light leading-[1.7] text-ink3">{p.desc}</p>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-(--border) flex justify-between items-center">
              <span className="text-[10px] tracking-[0.08em] uppercase text-ink3 font-semibold">
                {p.scenarios} scenarios
              </span>
              <span className="text-sm text-ink3 group-hover:translate-x-1 group-hover:text-ink transition-all duration-200">
                →
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
