'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog as RadixDialog, VisuallyHidden } from 'radix-ui';
import { useSyncExternalStore } from 'react';
import { cn } from '../ui/utils';
import { Kbd } from '../ui/Kbd';
import { shortcutRegistry, sortGroups } from './registry';
import { fuzzyFilter, type ScoredResult } from './fuzzy';
import { comboToTokens } from './keys';
import { usePlatformModKey } from './usePlatformModKey';
import { readRecentIds, pushRecentId } from './recent';
import type { PaletteNavItem } from './types';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: PaletteNavItem[];
}

interface Entry {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  hint?: string[];
  run: () => void;
}

const NAV_GROUP: Record<string, string> = {
  page: 'Navigation',
};

function navGroupFor(kind: string): string {
  return NAV_GROUP[kind] ?? 'Diagrams';
}

function subscribeRegistry(listener: () => void) {
  return shortcutRegistry.subscribe(listener);
}

/**
 * ⌘K / Ctrl+K (and the navbar search box) open this. A single combobox
 * input drives a listbox of grouped results — actions from the shortcut
 * registry, plus navigable diagrams/pages passed in from the server —
 * ranked by the hand-written fuzzy scorer in `fuzzy.ts`. Radix's Dialog
 * supplies the overlay, the focus trap (so Tab never escapes) and focus
 * return on close; we own the input/listbox/aria-activedescendant wiring
 * ourselves since that's a combobox pattern Radix doesn't model.
 */
export function CommandPalette({ open, onOpenChange, navItems }: CommandPaletteProps) {
  const router = useRouter();
  const modLabel = usePlatformModKey();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [recentIds, setRecentIds] = React.useState<string[]>([]);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Re-renders when a shortcut registers/unregisters elsewhere in the app
  // while the palette happens to be open. The count itself isn't read —
  // this is only here for the subscription's re-render side effect.
  useSyncExternalStore(subscribeRegistry, () => shortcutRegistry.list().length, () => 0);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setRecentIds(readRecentIds());
    }
  }, [open]);

  // Cheap (well under the 200-item budget on its own) and `registryVersion`
  // already forces a re-render on every register/unregister, so this is
  // plain per-render work rather than a memo with an artificial dependency.
  const actionEntries: Entry[] = shortcutRegistry.visible().map((def) => ({
    id: `action:${def.id}`,
    label: def.label,
    group: def.group,
    keywords: [def.group],
    hint: comboToTokens(def.keys, modLabel),
    run: () => def.handler(new KeyboardEvent('keydown')),
  }));

  const navEntries = React.useMemo<Entry[]>(
    () =>
      navItems.map((item) => ({
        id: `nav:${item.id}`,
        label: item.title,
        group: navGroupFor(item.kind),
        keywords: item.tags ?? [],
        run: () => router.push(item.href),
      })),
    [navItems, router],
  );

  const allEntries = React.useMemo<Entry[]>(() => [...actionEntries, ...navEntries], [actionEntries, navEntries]);
  const entryById = React.useMemo(() => new Map(allEntries.map((e) => [e.id, e])), [allEntries]);

  const trimmed = query.trim();
  const scored: ScoredResult<Entry>[] = React.useMemo(() => fuzzyFilter(trimmed, allEntries), [trimmed, allEntries]);

  const groupedSections = React.useMemo(() => {
    const showRecent = trimmed === '' && recentIds.length > 0;
    const recentSet = new Set<string>();
    const sections: { group: string; results: ScoredResult<Entry>[] }[] = [];

    if (showRecent) {
      const recentResults: ScoredResult<Entry>[] = [];
      for (const id of recentIds) {
        const entry = entryById.get(id);
        if (entry) {
          recentResults.push({ item: entry, score: 0, indices: [] });
          recentSet.add(id);
        }
      }
      if (recentResults.length > 0) sections.push({ group: 'Recent', results: recentResults });
    }

    const byGroup = new Map<string, ScoredResult<Entry>[]>();
    for (const result of scored) {
      if (recentSet.has(result.item.id)) continue;
      const list = byGroup.get(result.item.group) ?? [];
      list.push(result);
      byGroup.set(result.item.group, list);
    }
    for (const group of sortGroups([...byGroup.keys()])) {
      sections.push({ group, results: byGroup.get(group)! });
    }
    return sections;
  }, [scored, trimmed, recentIds, entryById]);

  const flatResults = React.useMemo(() => groupedSections.flatMap((s) => s.results), [groupedSections]);

  React.useEffect(() => {
    setActiveIndex((i) => (flatResults.length === 0 ? 0 : Math.min(i, flatResults.length - 1)));
  }, [flatResults.length]);

  React.useEffect(() => {
    if (!open) return;
    const activeEl = listRef.current?.querySelector('[aria-selected="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  function select(index: number) {
    const target = flatResults[index];
    if (!target) return;
    onOpenChange(false);
    pushRecentId(target.item.id);
    target.item.run();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (flatResults.length === 0 ? 0 : (i + 1) % flatResults.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (flatResults.length === 0 ? 0 : (i - 1 + flatResults.length) % flatResults.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(activeIndex);
    }
    // Escape and Tab are left to Radix's Dialog (closes / stays trapped).
  }

  const activeEntry = flatResults[activeIndex];
  const activeOptionId = activeEntry ? `cmdk-option-${activeEntry.item.id}` : undefined;

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-palette bg-[color-mix(in_srgb,var(--ink-primary)_32%,transparent)]',
            'data-[state=open]:animate-[fadein_var(--transition-duration-small)_ease-out]',
            'data-[state=closed]:animate-[fadeout_var(--transition-duration-micro)_var(--ease-exit)]',
          )}
        />
        <RadixDialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed inset-0 z-palette flex justify-center overflow-y-auto p-4 pt-[12vh]"
        >
          <VisuallyHidden.Root asChild>
            <RadixDialog.Title>Command palette</RadixDialog.Title>
          </VisuallyHidden.Root>
          <VisuallyHidden.Root asChild>
            <RadixDialog.Description>
              Search actions and diagrams, use the arrow keys to select and Enter to run.
            </RadixDialog.Description>
          </VisuallyHidden.Root>
          <div
            className={cn(
              'h-fit w-full max-w-[560px] overflow-hidden rounded-card border border-line-strong bg-surface-overlay shadow-elevation-2',
              'data-[state=open]:animate-[rise_var(--transition-duration-panel)_var(--ease-emphasized)]',
            )}
          >
            <label htmlFor="cmdk-input" className="sr-only">
              Search commands
            </label>
            <input
              ref={inputRef}
              id="cmdk-input"
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-listbox"
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Type a command or diagram…"
              className="h-13 w-full border-b border-line-hairline bg-transparent px-4.5 font-mono text-[15px] text-ink-primary outline-none placeholder:text-ink-muted placeholder:font-sans"
            />
            <ul
              ref={listRef}
              id="cmdk-listbox"
              role="listbox"
              aria-label="Commands"
              className="max-h-[340px] overflow-y-auto p-1.5"
            >
              {flatResults.length === 0 ? (
                <li className="px-3 py-6 text-center text-body text-ink-muted" role="presentation">
                  No matches
                </li>
              ) : (
                groupedSections.map(({ group, results }) => (
                  <React.Fragment key={group}>
                    <li
                      role="presentation"
                      className="px-2.5 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[.06em] text-ink-muted first:pt-1.5"
                    >
                      {group}
                    </li>
                    {results.map((result) => {
                      const flatIndex = flatResults.indexOf(result);
                      const isActive = flatIndex === activeIndex;
                      return (
                        <li
                          key={result.item.id}
                          id={`cmdk-option-${result.item.id}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => select(flatIndex)}
                          className={cn(
                            'flex h-9.5 cursor-pointer items-center justify-between gap-3 rounded-control px-2.5 text-[14px] text-ink-primary',
                            isActive
                              ? 'bg-surface-glass shadow-[inset_2px_0_0_var(--brand)]'
                              : 'hover:bg-surface-raised',
                          )}
                        >
                          <span className="truncate">{result.item.label}</span>
                          {result.item.hint && result.item.hint.length > 0 ? (
                            <span className="flex flex-none items-center gap-1 font-mono">
                              {result.item.hint.map((token, i) => (
                                <Kbd key={i}>{token}</Kbd>
                              ))}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </ul>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
