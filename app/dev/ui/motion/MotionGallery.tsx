'use client';

import * as React from 'react';
import { Button, Switch } from '@/app/(components)/ui';
import { DevUiHeader } from '../DevUiChrome';
import {
  MOTION_PRESETS,
  type MotionPreset,
  resolveMs,
  durationMs,
  easeVar,
  effectiveDurationMs,
  animateSpringPreset,
  runViewTransition,
  supportsViewTransitions,
  NumberRoll,
  type SpringHandle,
} from '@/app/(components)/motion';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 border-b border-line-hairline pb-2 text-title-2 text-ink-primary">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Renders one stage per preset beat, filling in over its resolved duration/delay/easing. */
function TimelineStages({ preset, reduced, active }: { preset: MotionPreset; reduced: boolean; active: boolean }) {
  if (reduced) {
    const mode = preset.reduced.mode;
    if (mode === 'instant' || mode === 'steady') {
      return (
        <div className="flex flex-1 items-center gap-2">
          <div className={`h-3 w-3 flex-none rounded-full ${mode === 'steady' ? 'bg-ink-secondary' : 'bg-ink-primary'}`} aria-hidden />
          <span className="text-[10px] font-mono text-ink-muted">
            {mode === 'instant' ? 'instant swap' : 'steady state'}
          </span>
        </div>
      );
    }
    const ms = durationMs(preset.reduced.duration ?? 'micro');
    return (
      <div className="flex flex-1 items-center gap-2">
        <div
          className="h-3 w-3 flex-none rounded-full bg-ink-primary"
          style={{
            opacity: active ? 1 : 0,
            transitionProperty: 'opacity',
            transitionDuration: `${ms}ms`,
            transitionTimingFunction: easeVar('standard'),
          }}
          aria-hidden
        />
        <span className="text-[10px] font-mono text-ink-muted">short fade ({ms}ms)</span>
      </div>
    );
  }

  return (
    <>
      {preset.stages.map((stage, i) => {
        const delayMs = stage.delay ? resolveMs(stage.delay) : 0;
        const durMs = resolveMs(stage.duration);
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="h-2 overflow-hidden rounded-pill bg-line-strong">
              <div
                className="h-full rounded-pill bg-brand"
                style={{
                  transform: active ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left',
                  transitionProperty: 'transform',
                  transitionDuration: `${durMs}ms`,
                  transitionDelay: `${delayMs}ms`,
                  transitionTimingFunction: stage.easing ? easeVar(stage.easing) : easeVar('standard'),
                }}
              />
            </div>
            <span className="truncate text-[10px] font-mono text-ink-muted">{stage.name}</span>
          </div>
        );
      })}
    </>
  );
}

/** Drives a spring-based stage live with `animateSpring`, so the utility itself is exercised in the gallery. */
function SpringDemo({
  springToken,
  reduced,
  playKey,
}: {
  springToken: NonNullable<MotionPreset['stages'][number]['spring']>;
  reduced: boolean;
  playKey: number;
}) {
  const [value, setValue] = React.useState(0);
  const handleRef = React.useRef<SpringHandle | null>(null);

  React.useEffect(() => {
    handleRef.current?.cancel();
    if (reduced) {
      setValue(1);
      return;
    }
    setValue(0);
    const handle = animateSpringPreset(springToken, {
      from: 0,
      to: 1,
      onUpdate: (v) => setValue(v),
    });
    handleRef.current = handle;
    return () => handle.cancel();
  }, [playKey, reduced, springToken]);

  return (
    <div className="flex flex-1 items-center gap-3">
      <div
        className="h-8 w-8 flex-none rounded-full bg-brand"
        style={{ transform: `scale(${0.35 + value * 0.65})`, opacity: 0.5 + value * 0.5 }}
        aria-hidden
      />
      <span className="text-[10px] font-mono text-ink-muted">spring-{springToken} · live rAF</span>
    </div>
  );
}

function PresetDemo({ preset, reduced }: { preset: MotionPreset; reduced: boolean }) {
  const [playKey, setPlayKey] = React.useState(0);
  const [active, setActive] = React.useState(false);
  const springStage = preset.stages.find((s) => s.spring);

  React.useEffect(() => {
    setActive(false);
    const id = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(id);
  }, [playKey, reduced]);

  const fullMs = effectiveDurationMs(preset, false);
  const reducedMs = effectiveDurationMs(preset, true);

  return (
    <div className="rounded-card border border-line-hairline bg-surface-raised p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-title-3 text-ink-primary">{preset.moment}</h3>
        <Button size="sm" variant="glass" onClick={() => setPlayKey((k) => k + 1)}>
          Replay
        </Button>
      </div>
      <p className="mb-3 text-body text-ink-secondary">{preset.summary}</p>

      <div className="mb-3 flex h-16 items-center gap-3 rounded-[10px] border border-line-hairline bg-surface-sunken px-4">
        {springStage && !reduced ? (
          <SpringDemo springToken={springStage.spring!} reduced={reduced} playKey={playKey} />
        ) : (
          <TimelineStages preset={preset} reduced={reduced} active={active} />
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
        <dt className="font-mono text-ink-muted">full motion</dt>
        <dd className="font-mono text-ink-secondary">{fullMs}ms · id `{preset.id}`</dd>
        <dt className="font-mono text-ink-muted">reduced motion</dt>
        <dd className="text-ink-secondary">
          {preset.reduced.mode !== 'steady' && preset.reduced.mode !== 'instant' ? `${reducedMs}ms — ` : ''}
          {preset.reduced.description}
        </dd>
      </dl>
    </div>
  );
}

function NumberRollDemo() {
  const [value, setValue] = React.useState(1240);
  const [reducedOverride, setReducedOverride] = React.useState<boolean | undefined>(undefined);

  return (
    <div className="rounded-card border border-line-hairline bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-title-3 text-ink-primary">Number roll</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="glass" onClick={() => setValue((v) => v + 12)}>
            Small tick (+12)
          </Button>
          <Button size="sm" variant="glass" onClick={() => setValue((v) => v * 15)}>
            Big jump (×15)
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setValue(1240)}>
            Reset
          </Button>
        </div>
      </div>
      <div className="flex h-16 items-center gap-3 rounded-[10px] border border-line-hairline bg-surface-sunken px-4">
        <NumberRoll
          value={value}
          format={(v) => Math.round(v).toLocaleString('en-US')}
          className="font-mono text-[28px] font-semibold text-ink-primary"
          reducedOverride={reducedOverride}
          ariaLabel="demo requests per second"
        />
        <span className="font-mono text-[13px] text-ink-muted">rps</span>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12px] text-ink-secondary">
        <Switch
          checked={reducedOverride ?? false}
          onCheckedChange={(v) => setReducedOverride(v)}
          aria-label="Force reduced motion for this demo only"
        />
        Force reduced for this demo only (independent of the page toggle)
      </label>
    </div>
  );
}

function ViewTransitionDemo({ reduced }: { reduced: boolean }) {
  const [on, setOn] = React.useState(false);
  // Starts `false` to match the server (which has no `document`), then reads
  // the real client-side answer after mount — a `useMemo` reading it directly
  // would mismatch whenever the browser actually supports the platform API.
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => setSupported(supportsViewTransitions()), []);

  return (
    <div className="rounded-card border border-line-hairline bg-surface-raised p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-title-3 text-ink-primary">View Transitions helper</h3>
        <Button
          size="sm"
          variant="glass"
          onClick={() => runViewTransition(() => setOn((v) => !v), { reduced })}
        >
          Toggle
        </Button>
      </div>
      <p className="mb-3 text-body text-ink-secondary">
        Runs a DOM update through the platform View Transition API when it&apos;s available and motion isn&apos;t
        reduced; otherwise the swap is instant.
      </p>
      <div
        className="flex h-16 items-center justify-center rounded-[10px] border border-line-hairline px-4 text-title-3"
        style={{ background: on ? 'var(--color-brand-subtle)' : 'var(--color-surface-sunken)' }}
      >
        {on ? 'After' : 'Before'}
      </div>
      <p className="mt-2 text-[12px] font-mono text-ink-muted">
        platform API supported here: {supported ? 'yes' : 'no'} · reduced: {reduced ? 'yes' : 'no'}
      </p>
    </div>
  );
}

export function MotionGallery() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-motion', reduced ? 'off' : 'on');
  }, [reduced]);

  return (
    <div className="min-h-screen bg-surface-page px-6 py-8 text-ink-primary">
      <DevUiHeader
        current="/dev/ui/motion"
        title="DS6 — Motion gallery"
        description="Every signature-moment preset, with its full-motion choreography and its reduced-motion variant."
      />

      <Section title="Reduced motion">
        <label className="flex items-center gap-2 text-body text-ink-secondary">
          <Switch checked={reduced} onCheckedChange={setReduced} aria-label="Reduced motion" />
          Reduced motion (sets <code>data-motion=&quot;off&quot;</code> on the page — the same override the app&apos;s own
          Motion setting uses; <code>prefers-reduced-motion</code> at the OS level is honored automatically and
          independently)
        </label>
      </Section>

      <Section title="Presets">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MOTION_PRESETS.map((preset) => (
            <PresetDemo key={preset.id} preset={preset} reduced={reduced} />
          ))}
        </div>
      </Section>

      <Section title="Number roll">
        <NumberRollDemo />
      </Section>

      <Section title="View transitions">
        <ViewTransitionDemo reduced={reduced} />
      </Section>
    </div>
  );
}
