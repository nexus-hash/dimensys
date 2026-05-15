'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConceptCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

export default function ConceptCard({ title, description, icon, href }: ConceptCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setTilt({
      rotateX: ((y - centerY) / centerY) * -8,
      rotateY: ((x - centerX) / centerX) * 8,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      onClick={() => router.push(href)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-pointer group rounded-xl p-6 sm:p-8 h-full
                 glass transition-all duration-300 ease-out
                 hover:border-orange-500/40 dark:hover:border-orange-400/40"
      style={{
        transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        transition: isHovered ? 'none' : 'transform 0.5s ease-out',
        boxShadow: isHovered
          ? '0 0 24px 2px rgba(255, 102, 0, 0.15), 0 8px 32px rgba(0,0,0,0.3)'
          : '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Icon */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 mb-5 text-orange-500 dark:text-orange-400
                      transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold mb-3 text-light-secondary dark:text-dark-secondary">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm sm:text-base text-light-secondary/60 dark:text-dark-secondary/60 leading-relaxed">
        {description}
      </p>

      {/* Arrow indicator */}
      <div className="mt-5 flex items-center gap-2 text-orange-500 dark:text-orange-400 text-sm font-medium
                      opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0
                      transition-all duration-300">
        Explore
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </div>
    </div>
  );
}
