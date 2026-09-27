import React from 'react';
import Link from 'next/link';
import { BrandMark } from '../brand/BrandMark';

export default function Footer() {
  return (
    <footer className="relative w-full dark:bg-dark-primary bg-light-primary border-t border-orange-500/30 overflow-hidden mt-24">
      {/* Subtle grid background */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand */}
          <div className="flex flex-col items-start">
            <Link href="/" className="mb-4 flex select-none items-center gap-2" aria-label="dimensys home">
              <BrandMark size={28} />
              <span className="text-title-3 font-semibold tracking-tight text-ink-primary">dimensys</span>
            </Link>
            <p className="text-sm text-light-secondary/60 dark:text-dark-secondary/60">
              Master the architecture of software
            </p>
          </div>

          {/* Column 2: Learn */}
          <div>
            <h3 className="text-light-primary dark:text-dark-primary font-bold mb-4">Learn</h3>
            <ul className="space-y-3">
              {[
                { label: 'Explore systems', href: '/explore' },
                { label: 'Concepts', href: '/concepts' },
                { label: 'Learning paths', href: '/paths' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-light-secondary/60 hover:text-orange-500 dark:text-dark-secondary/60 dark:hover:text-orange-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-light-primary dark:text-dark-primary font-bold mb-4">Resources</h3>
            <ul className="space-y-3">
              {[
                { label: 'Outage replays', href: '/replays' },
                { label: "Today's outage", href: '/daily' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-light-secondary/60 hover:text-orange-500 dark:text-dark-secondary/60 dark:hover:text-orange-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="text-light-primary dark:text-dark-primary font-bold mb-4">Company</h3>
            <ul className="space-y-3">
              {[
                { label: 'About', href: '/about' },
                { label: 'Privacy', href: '/privacy' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-light-secondary/60 hover:text-orange-500 dark:text-dark-secondary/60 dark:hover:text-orange-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-light-secondary/10 dark:border-dark-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-light-secondary/50 dark:text-dark-secondary/50">
            © 2026 dimensys · non-commercial · the simulation is a model, not a benchmark
          </p>
        </div>
      </div>
    </footer>
  );
}
