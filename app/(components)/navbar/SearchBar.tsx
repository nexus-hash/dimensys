'use client';

import { usePlatformModKey } from '@/app/(components)/command';
import { useCommandPalette } from '@/app/(components)/command';

/**
 * The navbar's search entry point. It no longer owns any search behaviour
 * itself — clicking (or ⌘K/Ctrl+K, bound globally by `CommandProvider`)
 * opens the command palette, which does the actual fuzzy search over
 * diagrams, pages and actions. This keeps the pill-button look (icon,
 * label, mono shortcut badge) from the previous inline-expanding version.
 */
export default function SearchBar() {
  const { openPalette } = useCommandPalette();
  const modKey = usePlatformModKey();
  const shortcutLabel = modKey === '⌘' ? '⌘K' : `${modKey}+K`;

  return (
    <div className="relative flex items-center justify-end">
      <button
        type="button"
        onClick={openPalette}
        aria-label="Open command palette"
        className="group flex h-10 items-center gap-2 rounded-full px-3 text-light-secondary/70 transition-colors hover:bg-light-secondary/5 hover:text-orange-500 dark:text-dark-secondary/70 dark:hover:bg-dark-secondary/10 dark:hover:text-orange-400"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span className="hidden text-sm sm:inline">Search...</span>
        <span className="hidden items-center justify-center whitespace-nowrap rounded border border-line-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:flex">
          {shortcutLabel}
        </span>
      </button>
    </div>
  );
}
