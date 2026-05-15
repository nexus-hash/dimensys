import React from 'react';

export default function Footer() {
  return (
    <footer className="relative w-full dark:bg-dark-primary bg-light-primary border-t border-orange-500/30 overflow-hidden mt-24">
      {/* Subtle grid background */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand */}
          <div className="flex flex-col items-start">
            <svg
              className="w-10 h-10 text-orange-500 mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Isometric Cube Wireframe */}
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <p className="text-sm text-light-secondary/60 dark:text-dark-secondary/60 mb-6">
              Master the architecture of software
            </p>
            <div className="flex items-center gap-4 text-light-secondary/50 dark:text-dark-secondary/50">
              {/* GitHub */}
              <a href="#" className="hover:text-orange-500 transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              {/* X (Twitter) */}
              <a href="#" className="hover:text-orange-500 transition-colors" aria-label="X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </a>
              {/* Discord */}
              <a href="#" className="hover:text-orange-500 transition-colors" aria-label="Discord">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Learn */}
          <div>
            <h3 className="text-light-primary dark:text-dark-primary font-bold mb-4">Learn</h3>
            <ul className="space-y-3">
              {['System Design', 'Low Level Design', 'DSA', 'Patterns'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-light-secondary/60 hover:text-orange-500 dark:text-dark-secondary/60 dark:hover:text-orange-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-light-primary dark:text-dark-primary font-bold mb-4">Resources</h3>
            <ul className="space-y-3">
              {['Documentation', 'Blog', 'Changelog', 'FAQ'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-light-secondary/60 hover:text-orange-500 dark:text-dark-secondary/60 dark:hover:text-orange-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="text-light-primary dark:text-dark-primary font-bold mb-4">Company</h3>
            <ul className="space-y-3">
              {['About Us', 'Contact', 'Privacy', 'Terms'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-light-secondary/60 hover:text-orange-500 dark:text-dark-secondary/60 dark:hover:text-orange-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-light-secondary/10 dark:border-dark-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-light-secondary/50 dark:text-dark-secondary/50">
            © 2026 dimensys. All rights reserved.
          </p>
          <p className="text-xs text-light-secondary/40 dark:text-dark-secondary/40">
            Built with Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
