'use client';

import { useEffect, useRef, useState } from 'react';

type RevealDirection = 'up' | 'left' | 'right' | 'fade' | 'scale';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: RevealDirection;
  delay?: number;
  threshold?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  threshold = 0.15,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);

    // Fallback: If after 400ms (to let page layout and routing transition settle) the observer 
    // has not fired, check manually if the element is within or above the viewport scroll bounds.
    const fallbackTimeout = setTimeout(() => {
      if (element) {
        const rect = element.getBoundingClientRect();
        const isInOrAboveViewport = rect.top < (window.innerHeight || document.documentElement.clientHeight);
        if (isInOrAboveViewport) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      }
    }, 400);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimeout);
    };
  }, [threshold]);

  const animationClass = isVisible ? `scroll-visible-${direction}` : 'scroll-hidden';

  return (
    <div
      ref={ref}
      className={`${animationClass} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
