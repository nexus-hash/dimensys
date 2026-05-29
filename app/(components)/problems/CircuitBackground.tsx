'use client';

import { useEffect, useState } from 'react';

const Circuit1 = ({ className }: { className?: string }) => (
  <svg className={className} width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="currentColor">
    <path d="M 10 10 L 40 10 L 60 30 L 60 90 L 80 110 L 110 110" strokeWidth="1.5" className="circuit-path-1" />
    <circle cx="10" cy="10" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="110" cy="110" r="3" fill="currentColor" className="animate-pulse" />
  </svg>
);

const Circuit2 = ({ className }: { className?: string }) => (
  <svg className={className} width="150" height="100" viewBox="0 0 150 100" fill="none" stroke="currentColor">
    <path d="M 140 20 L 100 20 L 80 40 L 40 40 L 20 60 L 20 90" strokeWidth="1.5" className="circuit-path-2" />
    <circle cx="140" cy="20" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="20" cy="90" r="3" fill="currentColor" className="animate-pulse" />
  </svg>
);

const Circuit3 = ({ className }: { className?: string }) => (
  <svg className={className} width="100" height="150" viewBox="0 0 100 150" fill="none" stroke="currentColor">
    <path d="M 20 140 L 20 100 L 40 80 L 40 40 L 60 20 L 90 20" strokeWidth="1.5" className="circuit-path-1" />
    <circle cx="20" cy="140" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="90" cy="20" r="3" fill="currentColor" className="animate-pulse" />
  </svg>
);

const Circuit4 = ({ className }: { className?: string }) => (
  <svg className={className} width="200" height="80" viewBox="0 0 200 80" fill="none" stroke="currentColor">
    <path d="M 10 70 L 40 70 L 60 50 L 140 50 L 160 30 L 190 30" strokeWidth="1.5" className="circuit-path-2" />
    <circle cx="10" cy="70" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="190" cy="30" r="3" fill="currentColor" className="animate-pulse" />
  </svg>
);

const CIRCUITS = [Circuit1, Circuit2, Circuit3, Circuit4];

interface NodeInstance {
  id: number;
  Component: any;
  top: number;
  left: number;
  opacity: number;
  scale: number;
  rotate: number;
}

export default function CircuitBackground() {
  const [nodes, setNodes] = useState<NodeInstance[]>([]);

  useEffect(() => {
    // Generate a pseudo-random scattering of circuits to avoid a repeating pattern
    const newNodes: NodeInstance[] = [];
    const count = 25; // Number of circuits scattered across the background

    for (let i = 0; i < count; i++) {
      const CType = CIRCUITS[Math.floor(Math.random() * CIRCUITS.length)];
      newNodes.push({
        id: i,
        Component: CType,
        top: Math.random() * 100, // percentage
        left: Math.random() * 100, // percentage
        opacity: 0.3 + Math.random() * 0.7, // 0.3 to 1.0 opacity multiplier (relative to container)
        scale: 0.8 + Math.random() * 0.7, // 0.8 to 1.5 scale
        rotate: Math.floor(Math.random() * 4) * 90, // Randomly rotate by 0, 90, 180, or 270 degrees
      });
    }
    setNodes(newNodes);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10 dark:opacity-20 text-orange-500">
      <style>{`
        .circuit-path-1 {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: circuit-dash 10s linear infinite;
        }
        .circuit-path-2 {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: circuit-dash 15s linear infinite reverse;
        }
        @keyframes circuit-dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      
      {/* Container for fixed positioning since absolute inset-0 is relative to parent container */}
      <div className="relative w-full h-[200vh]"> 
        {nodes.map((node) => {
          const Comp = node.Component;
          return (
            <div 
              key={node.id} 
              className="absolute"
              style={{
                top: `${node.top}%`,
                left: `${node.left}%`,
                opacity: node.opacity,
                transform: `scale(${node.scale}) rotate(${node.rotate}deg)`,
              }}
            >
              <Comp />
            </div>
          );
        })}
      </div>
    </div>
  );
}
