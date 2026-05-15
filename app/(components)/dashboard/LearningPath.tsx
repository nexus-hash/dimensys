'use client';

import { useEffect, useRef, useState } from 'react';
import ScrollReveal from './ScrollReveal';

const milestones = [
  { label: 'HLD' },
  { label: 'LLD' },
  { label: 'DSA' },
];

export default function LearningPath() {
  const pathRef = useRef<SVGPathElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          observer.unobserve(section);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  /* Particle positions (static, CSS-animated) */
  const particles = Array.from({ length: 12 }, (_, i) => ({
    left: `${8 + Math.random() * 84}%`,
    top: `${10 + Math.random() * 80}%`,
    size: 2 + Math.random() * 3,
    delay: `${i * 0.7}s`,
    duration: `${4 + Math.random() * 4}s`,
    driftX: `${-30 + Math.random() * 60}px`,
    driftY: `${-40 + Math.random() * -30}px`,
  }));

  return (
    <section ref={sectionRef} id="learning-path" className="relative w-full px-6 py-24 sm:py-32 overflow-hidden">
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-orange-500/30 dark:bg-orange-400/30"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `particle-drift ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
              '--drift-x': p.driftX,
              '--drift-y': p.driftY,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Section Header */}
        <ScrollReveal direction="up">
          <div className="text-center mb-20">
            <span className="text-sm uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400 font-medium">
              Your Journey
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-light-secondary dark:text-dark-secondary">
              The Learning Path
            </h2>
          </div>
        </ScrollReveal>

        {/* SVG Path */}
        <div className="relative w-full h-[180px] sm:h-[220px] md:h-[280px]">
          <svg
            viewBox="0 0 900 250"
            fill="none"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="pathGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff6600" />
                <stop offset="50%" stopColor="#FF5F15" />
                <stop offset="100%" stopColor="#ff8c42" />
              </linearGradient>
              <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Dashed background path */}
            <path
              d="M 80 200 C 200 200, 250 50, 450 50 C 650 50, 700 200, 820 200"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8 8"
              className="text-light-secondary/15 dark:text-dark-secondary/15"
            />
            {/* Animated draw path */}
            <path
              ref={pathRef}
              d="M 80 200 C 200 200, 250 50, 450 50 C 650 50, 700 200, 820 200"
              stroke="url(#pathGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="1200"
              strokeDashoffset={drawn ? '0' : '1200'}
              style={{ transition: 'stroke-dashoffset 2.5s ease-out' }}
            />

            {/* Milestone nodes — inside SVG so they align perfectly */}
            {[
              { cx: 80, cy: 200, label: 'HLD' },
              { cx: 450, cy: 50, label: 'LLD' },
              { cx: 820, cy: 200, label: 'DSA' },
            ].map((node, i) => (
              <g key={node.label}>
                {/* Glow ring */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="12"
                  fill="#ff6600"
                  opacity={drawn ? 0.3 : 0}
                  filter="url(#dotGlow)"
                  style={{ transition: 'opacity 0.5s ease-out', transitionDelay: `${i * 0.6}s` }}
                >
                  {drawn && (
                    <animate
                      attributeName="r"
                      values="12;18;12"
                      dur="2s"
                      begin={`${i * 0.6}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
                {/* Solid dot */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r="8"
                  fill="#ff6600"
                  opacity={drawn ? 1 : 0}
                  style={{ transition: 'opacity 0.5s ease-out', transitionDelay: `${i * 0.6}s` }}
                />
                {/* Label */}
                <text
                  x={node.cx}
                  y={node.cy + 28}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="700"
                  letterSpacing="0.1em"
                  fill="#ff6600"
                  opacity={drawn ? 1 : 0}
                  style={{ transition: 'opacity 0.5s ease-out', transitionDelay: `${i * 0.6 + 0.3}s` }}
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
