'use client';

import { DropdownMenu as RxDropdown } from 'radix-ui';
import { CheckIcon, ChevronDownIcon } from '@/app/(components)/ui/icons';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import type { PlayerMode } from '../store/playerStore';
import { MODE_DEFS, type ModeAvailability } from './modes';

export interface ModeMenuProps {
  availability: Record<PlayerMode, ModeAvailability>;
}

/**
 * The phone top bar's mode control: the segmented switcher has no room on a
 * phone, so the current mode's name is a button that opens the modes as a
 * radio menu (touch-sized rows; Build shows as coming soon). Shown only
 * below the phone breakpoint (`.player-mode-menu` in `globals.css`); the
 * digit shortcuts stay with `ModeSwitcher`, which is always mounted.
 */
export function ModeMenu({ availability }: ModeMenuProps) {
  const mode = usePlayerStore((s) => s.mode);
  const store = usePlayerStoreApi();
  const visible = MODE_DEFS.filter((m) => availability[m.id] !== 'hidden');
  const current = MODE_DEFS.find((m) => m.id === mode) ?? MODE_DEFS[0];

  return (
    <RxDropdown.Root>
      <RxDropdown.Trigger asChild>
        <button type="button" className="player-mode-menu" aria-label={`Mode: ${current.label}`} data-mode-menu>
          <span className="truncate">{current.label}</span>
          <ChevronDownIcon aria-hidden="true" className="player-mode-menu-chev" />
        </button>
      </RxDropdown.Trigger>
      <RxDropdown.Portal>
        <RxDropdown.Content className="player-mode-menu-list" align="end" sideOffset={6} aria-label="Mode">
          <RxDropdown.RadioGroup
            value={mode}
            onValueChange={(value) => {
              const id = value as PlayerMode;
              if (availability[id] === 'available') store.setState({ mode: id });
            }}
          >
            {visible.map((m) => {
              const soon = availability[m.id] === 'disabled';
              return (
                <RxDropdown.RadioItem key={m.id} value={m.id} disabled={soon} className="player-mode-menu-item" data-mode={m.id}>
                  <span>{m.label}</span>
                  {soon ? (
                    <span className="player-mode-menu-soon">Coming soon</span>
                  ) : (
                    <RxDropdown.ItemIndicator>
                      <CheckIcon aria-hidden="true" className="player-mode-menu-check" />
                    </RxDropdown.ItemIndicator>
                  )}
                </RxDropdown.RadioItem>
              );
            })}
          </RxDropdown.RadioGroup>
        </RxDropdown.Content>
      </RxDropdown.Portal>
    </RxDropdown.Root>
  );
}
