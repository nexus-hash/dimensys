'use client';

import { useState, useRef, useEffect } from 'react';

export default function SearchBar() {
  const [expanded, setExpanded] = useState(false);
  const [shortcutKey, setShortcutKey] = useState('⌘K');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect OS for shortcut key display
    const platform = window.navigator?.userAgent?.toLowerCase() || '';
    if (platform.includes('mac')) {
      setShortcutKey('⌘K');
    } else {
      setShortcutKey('Ctrl+K');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setExpanded(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex items-center justify-end">
      <div
        className={`px-2 flex items-center justify-between transition-all duration-700 ease-out overflow-hidden rounded-full ${
          expanded
            ? 'w-48 sm:w-64 glass ring-1 ring-orange-500/50 bg-[rgba(255,255,255,0.1)] dark:bg-[rgba(0,0,0,0.2)]'
            : 'ring-transparent bg-transparent hover:bg-light-secondary/5 dark:hover:bg-dark-secondary/10'
        }`}
      >
        <button
          onClick={() => {
            setExpanded(!expanded);
            if (!expanded) setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-light-secondary/70 dark:text-dark-secondary/70 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          aria-label="Search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          className={`bg-transparent outline-none text-sm text-light-secondary dark:text-dark-secondary placeholder-light-secondary/40 dark:placeholder-dark-secondary/40 transition-opacity duration-200 ${
            expanded ? 'opacity-100 w-full pr-14' : 'opacity-0 w-0 hidden'
          }`}
          onBlur={() => {
            if (inputRef.current?.value === '') {
              setExpanded(false);
            }
          }}
        />
        {/* Shortcut Badge */}
        <div
          className={`flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-light-secondary/20 dark:border-dark-secondary/20 text-light-secondary/50 dark:text-dark-secondary/50 pointer-events-none transition-opacity duration-200 whitespace-nowrap ${
            expanded ? 'opacity-0 sm:opacity-100' : 'opacity-100'
          }`}
        >
          {shortcutKey}
        </div>
      </div>
    </div>
  );
}