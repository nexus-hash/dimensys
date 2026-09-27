'use client';

import Link from 'next/link';
import { IconButton, Button, Kbd } from '@/app/(components)/ui';
import { PanelLeftIcon, ShareIcon, SettingsIcon } from '@/app/(components)/ui/icons';
import { useCommandPalette, usePlatformModKey } from '@/app/(components)/command';
import type { PlayerMode } from '../store/playerStore';
import { ModeSwitcher } from './ModeSwitcher';
import { PlayerBreadcrumbs } from './PlayerBreadcrumbs';
import type { ModeAvailability } from './modes';

export interface TopBarProps {
  title: string;
  labelsById: Record<string, string>;
  modeAvailability: Record<PlayerMode, ModeAvailability>;
  railOpen: boolean;
  onToggleRail: () => void;
}

/**
 * The player's top bar: rail toggle, breadcrumbs, the mode switcher,
 * and share/settings placeholders (real affordances are a later task — these
 * are inert but keyboard-reachable so the frame's tab order is final now).
 */
export function TopBar({ title, labelsById, modeAvailability, railOpen, onToggleRail }: TopBarProps) {
  const { openPalette } = useCommandPalette();
  const modKey = usePlatformModKey();

  return (
    <header className="player-topbar">
      <IconButton
        className="player-rail-toggle"
        aria-label="Toggle left rail"
        aria-expanded={railOpen}
        pressed={railOpen}
        onClick={onToggleRail}
      >
        <PanelLeftIcon />
      </IconButton>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-body text-ink-secondary">
        <Link
          href="/problems"
          className="player-desktop-only flex items-center gap-1 rounded px-1 -mx-1 hover:text-ink-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Explore
        </Link>
        <span aria-hidden="true" className="player-desktop-only text-ink-muted">
          &rsaquo;
        </span>
        <PlayerBreadcrumbs rootLabel={title} labelsById={labelsById} />
      </nav>

      <div className="flex min-w-0 items-center gap-2">
        <ModeSwitcher availability={modeAvailability} />
      </div>

      <div className="flex flex-none items-center gap-1">
        {/* Placeholders — the share sheet and settings menu are later tasks. */}
        <Button variant="ghost" size="sm" className="player-desktop-only" disabled aria-disabled title="Share (coming soon)">
          <ShareIcon />
          Share
        </Button>
        <IconButton aria-label="Share" disabled className="player-phone-only">
          <ShareIcon />
        </IconButton>
        <Button variant="ghost" size="sm" className="player-desktop-only gap-1.5" onClick={openPalette} aria-label="Command palette">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </Button>
        <IconButton aria-label="Settings" disabled title="Settings (coming soon)">
          <SettingsIcon />
        </IconButton>
      </div>
    </header>
  );
}
