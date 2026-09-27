'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button, cn } from '@/app/(components)/ui';

/**
 * Every dev-only kit gallery under /dev/ui, in one place, so `<DevUiNav>` can
 * link between them and every page agrees on the list. Keep this in sync with
 * `app/dev/ui/**\/page.tsx`.
 */
export const DEV_UI_KITS = [
  { href: '/dev/ui', label: 'DS3 · Primitives' },
  { href: '/dev/ui/canvas', label: 'DS5 · Canvas' },
  { href: '/dev/ui/data', label: 'DS4 · Data' },
  { href: '/dev/ui/motion', label: 'DS6 · Motion' },
  { href: '/dev/ui/command', label: 'DS7 · Command' },
  { href: '/dev/ui/content', label: 'DS8 · Content' },
] as const;

/**
 * Shared kit-to-kit navigation strip, rendered at the top of every /dev/ui
 * gallery page. `current` is the page's own pathname, so it can mark itself
 * with `aria-current="page"` instead of a plain link.
 */
export function DevUiNav({ current }: { current: string }) {
  return (
    <nav aria-label="Component kit galleries" className="mb-4 flex flex-wrap gap-2">
      {DEV_UI_KITS.map((kit) => {
        const isCurrent = kit.href === current;
        return (
          <Link
            key={kit.href}
            href={kit.href}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              'rounded-pill border px-3 py-1 text-caption transition-colors duration-micro ease-standard',
              isCurrent
                ? 'border-brand bg-brand-subtle text-ink-primary'
                : 'border-line-hairline text-ink-secondary hover:border-line-strong hover:text-ink-primary',
            )}
          >
            {kit.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shared theme toggle button used in every gallery header (identical markup
 * everywhere, so the pages read as one system rather than six one-offs).
 * Reads `resolvedTheme` from next-themes; renders a neutral label until
 * mounted so SSR and the first client paint agree.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="glass"
      size="sm"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle color theme"
    >
      {mounted ? `Theme: ${resolvedTheme}` : 'Theme'}
    </Button>
  );
}

/**
 * Full header chrome (nav strip + title/description row + theme toggle),
 * shared so every /dev/ui page has the same shape. `title`/`description`
 * stay page-specific; `right` lets a page add extra controls (e.g. the DS3
 * motion switch) next to the theme toggle without forking the header.
 */
export function DevUiHeader({
  current,
  title,
  description,
  right,
}: {
  current: string;
  title: string;
  description: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-line-hairline pb-4">
      <DevUiNav current={current} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title-1">{title}</h1>
          <p className="mt-1 text-body text-ink-secondary">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
