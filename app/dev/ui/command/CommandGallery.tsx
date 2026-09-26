'use client';

import * as React from 'react';
import { Button, Switch, Kbd, Pill, toast } from '@/app/(components)/ui';
import {
  useShortcut,
  useShortcutScope,
  useRegisteredShortcuts,
  useCommandPalette,
  usePlatformModKey,
  comboToTokens,
} from '@/app/(components)/command';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 border-b border-line-hairline pb-2 text-title-2 text-ink-primary">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const DEMO_SCOPE = 'dev-gallery-demo';

export function CommandGallery() {
  const { openPalette, openCheatSheet } = useCommandPalette();
  const modLabel = usePlatformModKey();
  const groups = useRegisteredShortcuts();
  const [demoActive, setDemoActive] = React.useState(false);
  const [fired, setFired] = React.useState(0);

  // Only live while `demoActive` is on — proof that scoping actually gates
  // dispatch, not just display. Press "D" with the switch off: nothing
  // happens (and it's typing-guarded like any other unmodified key).
  useShortcutScope(DEMO_SCOPE, demoActive);
  useShortcut(
    { id: 'dev-gallery:demo-action', keys: 'd', label: 'Demo scoped action', group: 'Demo', when: DEMO_SCOPE },
    () => {
      setFired((n) => n + 1);
      toast('Demo shortcut fired (only while the scope is active)');
    },
  );

  return (
    <div className="min-h-screen bg-surface-page px-6 py-8 text-ink-primary">
      <header className="mb-8 border-b border-line-hairline pb-4">
        <h1 className="text-title-1">DS7 — Command palette gallery</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Development only (404s in production). The registry&apos;s live contents, a scoped demo shortcut, and
          triggers for the palette and cheat sheet — both mounted once, app-wide, by <code>CommandProvider</code>.
        </p>
      </header>

      <Section title="Open">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="glass" size="sm" onClick={openPalette}>
            Open command palette <Kbd className="ml-2">{modLabel}</Kbd>
            <Kbd>K</Kbd>
          </Button>
          <Button variant="glass" size="sm" onClick={openCheatSheet}>
            Open shortcut sheet <Kbd className="ml-2">?</Kbd>
          </Button>
        </div>
      </Section>

      <Section title="Demo scope">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-body text-ink-secondary">
            <Switch checked={demoActive} onCheckedChange={setDemoActive} aria-label="Activate demo scope" />
            Scope active ({DEMO_SCOPE})
          </label>
          <Pill variant={demoActive ? 'ok' : 'neutral'}>{demoActive ? 'D is live' : 'D is inactive'}</Pill>
          <span className="font-mono text-[12px] text-ink-muted">fired {fired}×</span>
        </div>
        <p className="text-body text-ink-secondary">
          Press <Kbd>D</Kbd> while the switch above is on — it fires. Turn it off and press <Kbd>D</Kbd> again —
          nothing happens, and it&apos;s ignored while typing in any field either way (unmodified single-key rule).
        </p>
      </Section>

      <Section title="Registered shortcuts (live)">
        {groups.length === 0 ? (
          <p className="text-body text-ink-muted">Nothing registered.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {groups.map(({ group, shortcuts }) => (
              <div key={group} className="mb-4">
                <h3 className="mb-1 font-mono text-[12px] uppercase tracking-[.06em] text-ink-muted">{group}</h3>
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
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
