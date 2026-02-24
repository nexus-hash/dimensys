export default function HeroDiagram() {
  return (
    <div className="absolute right-0 top-0 w-[55%] h-full text-ink opacity-0 animate-fade-in flex items-center justify-center pointer-events-none">
      <svg
        viewBox="0 0 540 480"
        fill="inherit"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[90%] h-[90%]"
      >
        {/* ── CLIENTS ── */}
        <rect x="20" y="100" width="72" height="36" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.45" />
        <text x="56" y="122" fontFamily="'JetBrains Mono',monospace" fontSize="8.5" fill="inherit" opacity="0.5" textAnchor="middle">CLIENT</text>

        <rect x="20" y="222" width="72" height="36" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.45" />
        <text x="56" y="244" fontFamily="'JetBrains Mono',monospace" fontSize="8.5" fill="inherit" opacity="0.5" textAnchor="middle">MOBILE</text>

        <rect x="20" y="344" width="72" height="36" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.45" />
        <text x="56" y="366" fontFamily="'JetBrains Mono',monospace" fontSize="8.5" fill="inherit" opacity="0.5" textAnchor="middle">SERVICE</text>

        {/* ── LOAD BALANCER ── */}
        <rect x="148" y="200" width="80" height="80" rx="3" stroke="inherit" strokeWidth="1.5" opacity="0.65" />
        <text x="188" y="237" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.6" textAnchor="middle">LOAD</text>
        <text x="188" y="249" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.6" textAnchor="middle">BALANCER</text>
        <path d="M170 240 L180 232 L190 240 L180 248 Z" stroke="inherit" strokeWidth="1" opacity="0.3" fill="none" />

        {/* ── API SERVERS ── */}
        <rect x="292" y="100" width="76" height="36" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.55" />
        <text x="330" y="118" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">API</text>
        <text x="330" y="130" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">SERVER 1</text>

        <rect x="292" y="222" width="76" height="36" rx="3" stroke="inherit" strokeWidth="1.8" opacity="0.8" />
        <text x="330" y="240" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.8" textAnchor="middle">API</text>
        <text x="330" y="252" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.8" textAnchor="middle">SERVER 2</text>

        <rect x="292" y="344" width="76" height="36" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.55" />
        <text x="330" y="362" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">API</text>
        <text x="330" y="374" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">SERVER 3</text>

        {/* ── CACHE ── */}
        <rect x="420" y="100" width="90" height="40" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.55" />
        <text x="465" y="118" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">CACHE</text>
        <text x="465" y="130" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.4" textAnchor="middle">Redis / Memcached</text>

        {/* ── MESSAGE QUEUE ── */}
        <rect x="420" y="220" width="90" height="40" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.55" />
        <text x="465" y="238" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">MSG QUEUE</text>
        <text x="465" y="250" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.4" textAnchor="middle">Kafka / RabbitMQ</text>

        {/* ── DATABASE ── */}
        <rect x="424" y="342" width="82" height="44" rx="3" stroke="inherit" strokeWidth="1.2" opacity="0.55" />
        <ellipse cx="465" cy="342" rx="41" ry="8" stroke="inherit" strokeWidth="1.2" opacity="0.4" />
        <text x="465" y="368" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.55" textAnchor="middle">DATABASE</text>
        <text x="465" y="380" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.4" textAnchor="middle">Primary / Replica</text>

        {/* ── CDN ── */}
        <rect x="148" y="20" width="80" height="34" rx="3" stroke="inherit" strokeWidth="1" opacity="0.35" />
        <text x="188" y="41" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.35" textAnchor="middle">CDN EDGE</text>

        {/* ── WORKER ── */}
        <rect x="292" y="430" width="76" height="32" rx="3" stroke="inherit" strokeWidth="1" opacity="0.35" />
        <text x="330" y="450" fontFamily="'JetBrains Mono',monospace" fontSize="8" fill="inherit" opacity="0.35" textAnchor="middle">WORKER</text>

        {/* ── EDGES ── */}
        <path d="M92 118 Q120 118 148 220" stroke="inherit" strokeWidth="1" opacity="0.3" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="2s" repeatCount="indefinite" />
        </path>
        <line x1="92" y1="240" x2="148" y2="240" stroke="inherit" strokeWidth="1.4" opacity="0.5" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1.5s" repeatCount="indefinite" />
        </line>
        <path d="M92 362 Q120 362 148 262" stroke="inherit" strokeWidth="1" opacity="0.3" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="2.4s" repeatCount="indefinite" />
        </path>
        <path d="M228 218 Q260 155 292 118" stroke="inherit" strokeWidth="1" opacity="0.4" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1.8s" repeatCount="indefinite" />
        </path>
        <line x1="228" y1="240" x2="292" y2="240" stroke="inherit" strokeWidth="1.6" opacity="0.65" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1.2s" repeatCount="indefinite" />
        </line>
        <path d="M228 262 Q260 325 292 362" stroke="inherit" strokeWidth="1" opacity="0.4" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="2.1s" repeatCount="indefinite" />
        </path>
        <line x1="368" y1="230" x2="420" y2="120" stroke="inherit" strokeWidth="1" opacity="0.4" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="1.6s" repeatCount="indefinite" />
        </line>
        <line x1="368" y1="240" x2="420" y2="240" stroke="inherit" strokeWidth="1.2" opacity="0.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="1.9s" repeatCount="indefinite" />
        </line>
        <line x1="368" y1="250" x2="420" y2="362" stroke="inherit" strokeWidth="1" opacity="0.4" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="2.3s" repeatCount="indefinite" />
        </line>
        <path d="M188 200 L188 54" stroke="inherit" strokeWidth="1" opacity="0.25" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M465 260 Q465 350 330 430" stroke="inherit" strokeWidth="1" opacity="0.25" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="2.8s" repeatCount="indefinite" />
        </path>

        {/* ── PACKETS ── */}
        <circle r="4" fill="inherit" opacity="0.85">
          <animateMotion dur="1.5s" repeatCount="indefinite" path="M92,240 L148,240" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle r="4" fill="inherit" opacity="0.85">
          <animateMotion dur="1.3s" repeatCount="indefinite" begin="0.3s" path="M228,240 L292,240" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="1.3s" repeatCount="indefinite" begin="0.3s" />
        </circle>
        <circle r="3.5" fill="inherit" opacity="0.7">
          <animateMotion dur="1.8s" repeatCount="indefinite" begin="0.9s" path="M368,230 L420,120" />
          <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.1;0.9;1" dur="1.8s" repeatCount="indefinite" begin="0.9s" />
        </circle>
        <circle r="3.5" fill="inherit" opacity="0.7">
          <animateMotion dur="2.2s" repeatCount="indefinite" begin="1.4s" path="M368,250 Q394,306 424,364" />
          <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.1;0.9;1" dur="2.2s" repeatCount="indefinite" begin="1.4s" />
        </circle>
        <circle r="3" fill="inherit" opacity="0.6">
          <animateMotion dur="2s" repeatCount="indefinite" begin="0.6s" path="M92,118 Q120,118 148,220" />
          <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.1;0.9;1" dur="2s" repeatCount="indefinite" begin="0.6s" />
        </circle>
        <circle r="3" fill="inherit" opacity="0.6">
          <animateMotion dur="1.9s" repeatCount="indefinite" begin="1.1s" path="M228,218 Q260,155 292,118" />
          <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.1;0.9;1" dur="1.9s" repeatCount="indefinite" begin="1.1s" />
        </circle>

        {/* ── LEGEND ── */}
        <line x1="20" y1="456" x2="34" y2="456" stroke="inherit" strokeWidth="1" opacity="0.3" strokeDasharray="4 3" />
        <text x="40" y="460" fontFamily="'JetBrains Mono',monospace" fontSize="7.5" fill="inherit" opacity="0.3">request flow</text>
        <circle cx="118" cy="456" r="3" fill="inherit" opacity="0.5" />
        <text x="126" y="460" fontFamily="'JetBrains Mono',monospace" fontSize="7.5" fill="inherit" opacity="0.3">live packet</text>
      </svg>
    </div>
  );
}
