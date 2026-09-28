'use client';

import * as React from 'react';
import { Dialog } from '../ui/Dialog';
import { Kbd } from '../ui/Kbd';
import { useRegisteredShortcuts } from './useShortcut';
import { usePlatformModKey } from './usePlatformModKey';
import { comboToTokens } from './keys';

export interface ShortcutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * `?` opens this: every shortcut currently registered anywhere in the app
 * (the global bindings plus whatever the active screen contributed),
 * grouped, two columns on wide viewports.
 */
export function ShortcutSheet({ open, onOpenChange }: ShortcutSheetProps) {
  const groups = useRegisteredShortcuts();
  const modLabel = usePlatformModKey();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      hideDescription
      description="Every shortcut currently registered, grouped by area."
    >
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {groups.length === 0 ? (
          <p className="text-body text-ink-muted">No shortcuts registered yet.</p>
        ) : (
          groups.map(({ group, shortcuts }) => (
            <React.Fragment key={group}>
              <h3 className="col-span-full mt-3 font-mono text-[12px] uppercase tracking-[.06em] text-ink-muted first:mt-0">
                {group}
              </h3>
              {shortcuts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-b border-line-hairline py-1.5 text-body text-ink-secondary"
                >
                  <span>{s.label}</span>
                  <span className="flex flex-none gap-1">
                    {comboToTokens(s.keys, modLabel).map((token, i) => (
                      <Kbd key={i}>{token}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </React.Fragment>
          ))
        )}
      </div>
    </Dialog>
  );
}
