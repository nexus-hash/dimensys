const items = [
  { label: "TinyURL",           accent: true  },
  { label: "Cache Hit/Miss",    accent: false },
  { label: "Rate Limiter",      accent: false },
  { label: "Netflix CDN",       accent: true  },
  { label: "Consistent Hashing",accent: false },
  { label: "Message Queue",     accent: false },
  { label: "Uber Dispatch",     accent: true  },
  { label: "DB Replication",    accent: false },
  { label: "Load Balancer",     accent: false },
  { label: "WhatsApp",          accent: true  },
  { label: "Typeahead Search",  accent: false },
  { label: "Geo-distribution",  accent: false },
];

export default function Marquee() {
  const doubled = [...items, ...items];
  return (
    <div className="py-8 border-t border-b border-(--border) bg-bg2 overflow-hidden">
      <div className="flex gap-0 animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span
            key={i}
            className={[
              "text-[11px] font-semibold tracking-[0.15em] uppercase px-8 border-r border-(--border)",
              item.accent ? "text-ink" : "text-ink3",
            ].join(" ")}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
