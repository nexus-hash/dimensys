'use client';

import Link from 'next/link';
import { IconButton, Button, Kbd } from '@/app/(components)/ui';
import { PanelLeftIcon, SettingsIcon } from '@/app/(components)/ui/icons';
import { useCommandPalette, usePlatformModKey } from '@/app/(components)/command';
import type { PlayerMode } from '../store/playerStore';
import { ModeSwitcher } from './ModeSwitcher';
import { ModeMenu } from './ModeMenu';
import type { ModeAvailability } from './modes';
import ThemeButton from '../../theme/ThemeButton';
import { BrandMark } from '../../brand/BrandMark';
import { ShareButton } from '../share/ShareButton';

export interface TopBarProps {
  title: string;
  modeAvailability: Record<PlayerMode, ModeAvailability>;
  railOpen: boolean;
  onToggleRail: () => void;
}

/**
 * The player's top bar: rail toggle, the breadcrumb (Explore › diagram
 * title — the title is the page's `h1`), the mode switcher,
 * Share (copies a link to exactly what's on screen) and a settings
 * placeholder (a later task; inert but keyboard-reachable so the frame's
 * tab order is final now).
 *
 * Three groups (start / modes / end): the start group is the only one that
 * shrinks (the title truncates), so nothing overlaps at any width. Tablet
 * drops the labels to icons (Share, the palette shortcut) and the
 * breadcrumb's parent; phone swaps the switcher for the mode menu
 * (`ModeMenu`) and drops the rail toggle and settings (see `globals.css`).
 */
export function TopBar({ title, modeAvailability, railOpen, onToggleRail }: TopBarProps) {
  const { openPalette } = useCommandPalette();
  const modKey = usePlatformModKey();

  return (
    <header className="player-topbar">
      <div className="player-topbar-start">
        <Link
          href="/"
          className="flex flex-none items-center gap-2 text-[17px] font-bold tracking-[-0.01em] text-ink-primary"
          aria-label="dimensys home"
          data-nav-brand
        >
          <BrandMark size={22} />
        </Link>
        <IconButton
          className="player-rail-toggle"
          aria-label="Toggle left rail"
          aria-expanded={railOpen}
          pressed={railOpen}
          onClick={onToggleRail}
        >
          <PanelLeftIcon />
        </IconButton>

        <nav aria-label="Breadcrumb" className="min-w-0 text-body text-ink-secondary">
          <ol className="flex min-w-0 items-center gap-1">
            <li className="player-desktop-only flex flex-none items-center gap-1">
              <Link
                href="/problems"
                className="rounded px-1 -mx-1 hover:text-ink-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Explore
              </Link>
              <span aria-hidden="true" className="text-ink-muted">
                &rsaquo;
              </span>
            </li>
            <li className="min-w-0" aria-current="page">
              <h1 className="truncate text-[15px] font-medium text-ink-primary">{title}</h1>
            </li>
          </ol>
        </nav>
      </div>

      <div className="player-topbar-modes">
        <ModeSwitcher availability={modeAvailability} />
        <ModeMenu availability={modeAvailability} />
      </div>

      <div className="player-topbar-end">
        <ShareButton />
        <ShareButton compact />
        <Button variant="ghost" size="sm" className="player-desktop-only gap-1.5" onClick={openPalette} aria-label="Command palette">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </Button>
        <ThemeButton />
        <IconButton aria-label="Settings" disabled title="Settings (coming soon)" className="player-settings">
          <SettingsIcon />
        </IconButton>
      </div>
    </header>
  );
}
