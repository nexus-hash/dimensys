'use client';

import { useEffect, useRef, useState } from 'react';
import ScrollReveal from './ScrollReveal';

const features = [
  'Visual, step-by-step concept breakdowns',
  'Interactive 3D architecture diagrams',
  'Real-world system design case studies',
  'Pattern recognition through practice',
];

function RotatingCube() {
  const cubeRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -20, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const autoAngle = useRef(0);
  const animFrameRef = useRef<number>(0);

  /* Auto-rotate when not dragging */
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!isDragging) {
        const dt = (now - lastTime) / 1000;
        autoAngle.current += dt * 18;
        setRotation((prev) => ({ x: prev.x, y: autoAngle.current }));
      }
      lastTime = now;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    autoAngle.current = rotation.y;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setRotation((prev) => ({
      x: prev.x - dy * 0.4,
      y: prev.y + dx * 0.4,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    autoAngle.current = rotation.y;
  };

  const faceStyle = (transform: string): React.CSSProperties => ({
    transform,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  });

  const faceClass =
    'absolute inset-0 glass rounded-lg flex items-center justify-center overflow-hidden p-4';
  const preClass =
    'text-[9px] text-orange-400 font-mono leading-relaxed whitespace-pre pointer-events-none';

  return (
    <div
      className="relative w-[180px] h-[180px] select-none"
      style={{ perspective: '800px', cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        ref={cubeRef}
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: isDragging ? 'none' : 'transform 0.1s linear',
        }}
      >
        <div className={faceClass} style={faceStyle('translateZ(90px)')}>
          <pre className={preClass}>
{`class LoadBalancer {
  servers: Server[]

  route(req) {
    return this
      .next()
      .handle(req)
  }
}`}
          </pre>
        </div>

        <div className={faceClass} style={faceStyle('rotateY(180deg) translateZ(90px)')}>
          <pre className={preClass}>
{`function bfs(root) {
  let q = [root]
  let seen = new Set()

  while (q.length) {
    let n = q.shift()
    visit(n)
  }
}`}
          </pre>
        </div>

        <div className={faceClass} style={faceStyle('rotateY(90deg) translateZ(90px)')}>
          <pre className={preClass}>
{`interface Observer {
  update(e): void
}

class EventBus {
  subs: Map
  emit(e) { ... }
}`}
          </pre>
        </div>

        <div className={faceClass} style={faceStyle('rotateY(-90deg) translateZ(90px)')}>
          <pre className={preClass}>
{`fn mergeSort(arr) {
  if arr.len <= 1
    return arr

  let mid = arr.len / 2
  return merge(
    sort(arr[..mid]),
    sort(arr[mid..])
  )
}`}
          </pre>
        </div>

        <div className={faceClass} style={faceStyle('rotateX(90deg) translateZ(90px)')}>
          <span className="text-orange-500 dark:text-orange-400 font-bold text-base tracking-wide pointer-events-none">
            dimensys
          </span>
        </div>

        <div className={faceClass} style={faceStyle('rotateX(-90deg) translateZ(90px)')}>
          <span className="text-orange-500/50 dark:text-orange-400/50 font-mono text-xs pointer-events-none">
            &lt;/&gt;
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section id="features" className="w-full px-6 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: Text */}
        <ScrollReveal direction="left">
          <div>
            <span className="text-sm uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400 font-medium">
              Feature Showcase
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-light-secondary dark:text-dark-secondary leading-tight">
              Immersive 3D{' '}
              <span className="text-orange-500 dark:text-orange-400">Learning</span>
            </h2>
            <p className="mt-6 text-light-secondary/60 dark:text-dark-secondary/60 leading-relaxed max-w-lg">
              Go beyond static tutorials. Explore system architectures, design patterns,
              and algorithms through interactive visualizations that make complex concepts
              click instantly.
            </p>
            <ul className="mt-8 space-y-4">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 mt-0.5 text-orange-500 dark:text-orange-400 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm sm:text-base text-light-secondary/70 dark:text-dark-secondary/70">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>

        {/* Right: 3D Cube */}
        <ScrollReveal direction="right">
          <div className="flex items-center justify-center py-12">
            <RotatingCube />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
