'use client';

import * as React from 'react';
import { shortcutRegistry } from './registry';
import { comboFromEvent } from './keys';
import { useShortcut } from './useShortcut';
import { CommandPalette } from './CommandPalette';
import { ShortcutSheet } from './ShortcutSheet';
import type { PaletteNavItem } from './types';

interface CommandContextValue {
  isPaletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  openCheatSheet: () => void;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);

/** Reach the palette/cheat sheet from anywhere under `CommandProvider` — e.g. the navbar search box. */
export function useCommandPalette(): CommandContextValue {
  const ctx = React.useContext(CommandContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within <CommandProvider>');
  }
  return ctx;
}

export interface CommandProviderProps {
  /** Navigable catalog/page rows, computed server-side and passed down as plain data. */
  navItems: PaletteNavItem[];
  children: React.ReactNode;
}

/**
 * Mounts the command palette + `?` cheat sheet once for the whole app: the
 * global ⌘K / Ctrl+K and `?` bindings, the keydown listener that feeds the
 * shortcut registry, and the two dialogs themselves. Everything else
 * (registering actions, opening the palette from the navbar search) goes
 * through the registry / `useCommandPalette` rather than reaching in here.
 */
export function CommandProvider({ navItems, children }: CommandProviderProps) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = React.useState(false);

  const openPalette = React.useCallback(() => {
    setCheatSheetOpen(false);
    setPaletteOpen(true);
  }, []);
  const closePalette = React.useCallback(() => setPaletteOpen(false), []);
  const openCheatSheet = React.useCallback(() => {
    setPaletteOpen(false);
    setCheatSheetOpen(true);
  }, []);

  useShortcut(
    { keys: 'mod+k', label: 'Command palette', group: 'Global', id: 'command-palette:open' },
    (event) => {
      event.preventDefault();
      setPaletteOpen((open) => !open);
    },
  );

  useShortcut(
    { keys: '?', label: 'Keyboard shortcuts', group: 'Global', id: 'command-palette:cheatsheet' },
    (event) => {
      event.preventDefault();
      openCheatSheet();
    },
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const combo = comboFromEvent(event);
      shortcutRegistry.dispatch(combo, event);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = React.useMemo<CommandContextValue>(
    () => ({ isPaletteOpen: paletteOpen, openPalette, closePalette, openCheatSheet }),
    [paletteOpen, openPalette, closePalette, openCheatSheet],
  );

  return (
    <CommandContext.Provider value={value}>
      {children}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} navItems={navItems} />
      <ShortcutSheet open={cheatSheetOpen} onOpenChange={setCheatSheetOpen} />
    </CommandContext.Provider>
  );
}
