'use client';

import { useEffect, useState } from 'react';

/* ── Inline SVG shape definitions ── */

const shapesSVG = [
  // HLD: Server rack
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="8" y="4" width="24" height="10" rx="2"/>
    <rect x="8" y="16" width="24" height="10" rx="2"/>
    <rect x="8" y="28" width="24" height="10" rx="2"/>
    <circle cx="28" cy="9" r="1.5"/>
    <circle cx="28" cy="21" r="1.5"/>
    <circle cx="28" cy="33" r="1.5"/>
  </svg>`,

  // HLD: Database cylinder
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <ellipse cx="20" cy="10" rx="12" ry="5"/>
    <path d="M8 10v20c0 2.76 5.37 5 12 5s12-2.24 12-5V10"/>
    <path d="M8 20c0 2.76 5.37 5 12 5s12-2.24 12-5" opacity="0.5"/>
  </svg>`,

  // HLD: Cloud / Load balancer
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M12 28h16a6 6 0 00-2-11.5A8 8 0 0010 20a6 6 0 002 8z"/>
    <line x1="16" y1="32" x2="16" y2="36"/>
    <line x1="24" y1="32" x2="24" y2="36"/>
    <line x1="12" y1="36" x2="28" y2="36"/>
  </svg>`,

  // HLD: Microservice boxes
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="2" width="14" height="14" rx="2"/>
    <rect x="24" y="2" width="14" height="14" rx="2"/>
    <rect x="13" y="24" width="14" height="14" rx="2"/>
    <line x1="16" y1="9" x2="24" y2="9"/>
    <line x1="16" y1="16" x2="20" y2="24"/>
    <line x1="31" y1="16" x2="27" y2="24"/>
  </svg>`,

  // LLD: Class diagram
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="6" y="4" width="28" height="32" rx="2"/>
    <line x1="6" y1="14" x2="34" y2="14"/>
    <line x1="6" y1="24" x2="34" y2="24"/>
    <text x="20" y="11" text-anchor="middle" font-size="5" fill="currentColor" stroke="none">Class</text>
  </svg>`,

  // LLD: Gear
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="20" cy="20" r="6"/>
    <circle cx="20" cy="20" r="2"/>
    <path d="M20 4v4M20 32v4M4 20h4M32 20h4M8.8 8.8l2.8 2.8M28.4 28.4l2.8 2.8M8.8 31.2l2.8-2.8M28.4 11.6l2.8-2.8"/>
  </svg>`,

  // LLD: Interface/Abstract marker
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M20 6l12 7v14l-12 7-12-7V13z"/>
    <circle cx="20" cy="20" r="4"/>
  </svg>`,

  // DSA: Binary tree
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="20" cy="6" r="4"/>
    <circle cx="10" cy="22" r="4"/>
    <circle cx="30" cy="22" r="4"/>
    <circle cx="5" cy="36" r="3"/>
    <circle cx="15" cy="36" r="3"/>
    <line x1="18" y1="10" x2="12" y2="18"/>
    <line x1="22" y1="10" x2="28" y2="18"/>
    <line x1="8" y1="25" x2="6" y2="33"/>
    <line x1="12" y1="25" x2="14" y2="33"/>
  </svg>`,

  // DSA: Linked list
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="14" width="8" height="12" rx="1"/>
    <rect x="16" y="14" width="8" height="12" rx="1"/>
    <rect x="30" y="14" width="8" height="12" rx="1"/>
    <path d="M10 20h6" marker-end="url(#arr)"/>
    <path d="M24 20h6" marker-end="url(#arr)"/>
    <defs><marker id="arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6z" fill="currentColor"/></marker></defs>
  </svg>`,

  // DSA: Graph
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="10" cy="10" r="4"/>
    <circle cx="30" cy="8" r="4"/>
    <circle cx="8" cy="30" r="4"/>
    <circle cx="32" cy="28" r="4"/>
    <circle cx="20" cy="20" r="3"/>
    <line x1="13" y1="12" x2="18" y2="18"/>
    <line x1="27" y1="10" x2="22" y2="18"/>
    <line x1="10" y1="26" x2="18" y2="22"/>
    <line x1="22" y1="22" x2="29" y2="26"/>
  </svg>`,

  // DSA: Stack
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="10" y="4" width="20" height="8" rx="1"/>
    <rect x="10" y="14" width="20" height="8" rx="1"/>
    <rect x="10" y="24" width="20" height="8" rx="1"/>
    <path d="M20 34v3M16 37h8" stroke-linecap="round"/>
  </svg>`,
];

interface FloatingShapesProps {
  count?: number;
  opacity?: number;
}

interface ShapeData {
  svg: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  reverse: boolean;
}

export default function FloatingShapes({ count = 18, opacity = 0.12 }: FloatingShapesProps) {
  const [shapes, setShapes] = useState<ShapeData[]>([]);

  useEffect(() => {
    const generated: ShapeData[] = Array.from({ length: count }, () => ({
      svg: shapesSVG[Math.floor(Math.random() * shapesSVG.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 28 + Math.random() * 36,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * -20,
      reverse: Math.random() > 0.5,
    }));
    setShapes(generated);
  }, [count]);

  if (shapes.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {shapes.map((shape, i) => (
        <div
          key={i}
          className="absolute text-light-secondary dark:text-dark-secondary"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            opacity,
            animation: `${shape.reverse ? 'float-reverse' : 'float'} ${shape.duration}s ease-in-out infinite`,
            animationDelay: `${shape.delay}s`,
          }}
          dangerouslySetInnerHTML={{ __html: shape.svg }}
        />
      ))}
    </div>
  );
}
