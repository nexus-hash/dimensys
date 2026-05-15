'use client';

import { useEffect, useRef, useState } from 'react';
import ScrollReveal from './ScrollReveal';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 500, suffix: '+', label: 'Problems' },
  { value: 50, suffix: '+', label: 'Concepts' },
  { value: 3, suffix: 'D', label: 'Interactive Environment' },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

export default function StatsBar() {
  return (
    <section id="stats" className="w-full px-6 py-16 sm:py-20">
      <ScrollReveal direction="scale">
        <div className="max-w-4xl mx-auto glass rounded-2xl p-8 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 sm:divide-x divide-orange-500/20 dark:divide-orange-400/20">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <span className="text-4xl sm:text-5xl font-bold text-orange-500 dark:text-orange-400">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </span>
                <span className="mt-2 text-sm sm:text-base text-light-secondary/60 dark:text-dark-secondary/60">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
