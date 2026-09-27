'use client';

import { useCommandPalette, usePlatformModKey } from '@/app/(components)/command';
import { Kbd, SearchIcon } from '@/app/(components)/ui';

/**
 * The navbar's search entry point: a bordered pill that opens the command
 * palette (which does the actual fuzzy search over diagrams, pages and
 * actions). ⌘K / Ctrl K is bound globally by `CommandProvider`; the hint
 * shows whichever the visitor's platform uses. The label hides below the
 * desktop breakpoint and the whole pill hides at phone width, where the
 * menu button opens the palette instead.
 */
export default function SearchBar() {
  const { openPalette } = useCommandPalette();
  const modKey = usePlatformModKey();
  const shortcutLabel = modKey === '⌘' ? '⌘K' : `${modKey} K`;

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label={`Search diagrams (${shortcutLabel})`}
      className="hidden h-8 items-center gap-2 rounded-lg border border-line-hairline pl-2.5 pr-2 text-[13px] text-ink-muted transition-colors duration-micro hover:border-line-strong hover:text-ink-secondary sm:inline-flex lg:min-w-[180px]"
    >
      <SearchIcon className="h-4 w-4 flex-none" />
      <span className="hidden lg:inline">Search diagrams</span>
      <Kbd className="ml-auto">{shortcutLabel}</Kbd>
    </button>
  );
}
