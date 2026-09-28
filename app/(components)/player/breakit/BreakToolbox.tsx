'use client';

/**
 * The Break it toolbox, in the chrome strip above the board (never over
 * it). Desktop and tablet get the toolbar row: a "Break it" label, one
 * button per tool with its keycap, Reset, and the Fix it toggle pushed to
 * the far end. Phone gets the same tools as a scrolling row of chips.
 *
 * Picking Kill / Partition / Slow / Flush arms the tool: the hint row under
 * the tools says what to pick and offers the same targets in a list, so the
 * whole flow works from the keyboard too (links aren't focusable on the
 * board). Spike opens its slider instead: 1× up to the diagram's maximum,
 * on a log scale, applied on release or with the Apply button.
 */
import { useId, useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Kbd, Popover, ResetIcon, Select, Slider, cn } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useBreakData } from './BreakContext';
import { breakUiFor, useBreakUi } from './breakStore';
import { useBreakCommands } from './useBreakCommands';
import { ToolIcon, WrenchIcon } from './icons';
import { DEFAULT_SPIKE, deriveFaults, formatMultiplier, offeredTools, targetName, targetsFor, toolDef, type BreakTool, type ToolDef } from './tools';
import { toolValue } from './BreakController';
import './breakit.css';

const PHONE_QUERY = '(max-width: 639px)';

function subscribePhone(cb: () => void) {
  const mql = window.matchMedia?.(PHONE_QUERY);
  mql?.addEventListener?.('change', cb);
  return () => mql?.removeEventListener?.('change', cb);
}

/** Phone layout, as a subscription (false on the server and before hydration). */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia?.(PHONE_QUERY).matches === true,
    () => false,
  );
}

export function BreakToolbox() {
  const mode = usePlayerStore((s) => s.mode);
  const { kit } = useBreakData();
  if (mode !== 'break' || !kit) return null;
  return <BreakToolboxInner />;
}

function BreakToolboxInner() {
  const store = usePlayerStoreApi();
  const data = useBreakData();
  const { kit } = data;
  const commands = useBreakCommands(data);
  const tools = offeredTools(kit);
  const armed = useBreakUi((s) => s.armed);
  const drawer = useBreakUi((s) => s.drawer);
  const status = usePlayerStore((s) => s.sim.status);
  const disabled = status !== 'ready';
  const phone = useIsPhone();

  function pick(tool: BreakTool) {
    breakUiFor(store).set((s) => ({ armed: s.armed === tool ? null : tool, spikeOpen: false }));
  }
  function toggleFix() {
    breakUiFor(store).set((s) => ({ drawer: !s.drawer, tab: 'fix', armed: null }));
  }

  return (
    <div className="break-bar">
      <div className="break-toolbox" role="toolbar" aria-label="Break it tools">
        <span className="break-tb-h" aria-hidden="true">
          Break it
        </span>
        {tools.map((t) =>
          t.id === 'spike' ? (
            <SpikeControl key={t.id} def={t} variant="bar" open={!phone} disabled={disabled} />
          ) : (
            <button
              key={t.id}
              type="button"
              className="break-tool"
              aria-pressed={armed === t.id}
              aria-keyshortcuts={t.ariaKey}
              disabled={disabled}
              title={t.hint}
              onClick={() => pick(t.id)}
            >
              <ToolIcon tool={t.id} />
              {t.label}
              <Kbd className="break-kbd">{t.keyLabel}</Kbd>
            </button>
          ),
        )}
        <button type="button" className="break-tool break-tool-reset" disabled={disabled} onClick={commands.reset} aria-keyshortcuts="R">
          <ResetIcon aria-hidden="true" />
          Reset
          <Kbd className="break-kbd">R</Kbd>
        </button>
        <button type="button" className="break-tool break-tool-fix" aria-pressed={drawer} onClick={toggleFix}>
          <WrenchIcon />
          Fix it
        </button>
      </div>
      <div className="break-chips" role="toolbar" aria-label="Break it tools">
        {tools.map((t) =>
          t.id === 'spike' ? (
            <SpikeControl key={t.id} def={t} variant="chip" open={phone} disabled={disabled} />
          ) : (
            <button key={t.id} type="button" className="break-chip" aria-pressed={armed === t.id} disabled={disabled} onClick={() => pick(t.id)}>
              <ToolIcon tool={t.id} />
              {t.chip}
            </button>
          ),
        )}
        <button type="button" className="break-chip" aria-pressed={drawer} onClick={toggleFix}>
          <WrenchIcon />
          Fix it
        </button>
        <button type="button" className="break-chip" disabled={disabled} onClick={commands.reset}>
          <ResetIcon aria-hidden="true" />
          Reset
        </button>
      </div>
      {armed ? <ArmedHint tool={armed} /> : null}
    </div>
  );
}

/** "Pick a node on the board · or choose [list] · Esc cancels". */
function ArmedHint({ tool }: { tool: BreakTool }) {
  const store = usePlayerStoreApi();
  const data = useBreakData();
  const { kit, catalog } = data;
  const commands = useBreakCommands(data);
  const def = toolDef(tool);
  const targets = useMemo(() => targetsFor(tool, catalog, kit), [tool, catalog, kit]);
  const what = def.needs === 'link' ? 'a link' : def.needs === 'node-or-link' ? 'a node or link' : tool === 'flush' ? 'a cache or CDN' : 'a node';

  return (
    <div className="break-armed" role="status">
      <span className="break-armed-text">
        <b>{def.label}:</b> pick {what} on the board, or
      </span>
      <Select
        aria-label={`${def.label} target`}
        className="break-armed-select"
        value=""
        placeholder="choose a target"
        options={targets.map((t) => ({ value: t.id, label: targetName(t, catalog) }))}
        onValueChange={(id) => commands.apply(tool, id, toolValue(tool))}
      />
      <button type="button" className="break-armed-cancel" onClick={() => breakUiFor(store).set({ armed: null })}>
        Cancel <Kbd className="break-kbd">Esc</Kbd>
      </button>
    </div>
  );
}

/** The Spike button (or chip) and its slider popover. `open` gates which of the two instances may show the popover. */
function SpikeControl({
  def,
  variant,
  open,
  disabled,
}: {
  def: ToolDef;
  variant: 'bar' | 'chip';
  open: boolean;
  disabled: boolean;
}) {
  const store = usePlayerStoreApi();
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const cap = Math.max(2, data.kit?.cap ?? 50);
  const spikeOpen = useBreakUi((s) => s.spikeOpen);
  const current = usePlayerStore((s) => deriveFaults(s.actions).spike);
  const preset = data.kit?.chips.find((c) => c.verb === 'spike')?.amt ?? DEFAULT_SPIKE;
  const [value, setValue] = useState(Math.min(cap, preset));
  const readoutId = useId();

  const trigger =
    variant === 'bar' ? (
      <button
        type="button"
        className="break-tool"
        aria-pressed={spikeOpen && open}
        aria-haspopup="dialog"
        aria-keyshortcuts={def.ariaKey}
        disabled={disabled}
        title={def.hint}
      >
        <ToolIcon tool="spike" />
        {def.label}
        {current !== 1 ? <span className="break-tool-val">{formatMultiplier(current)}</span> : null}
        <Kbd className="break-kbd">{def.keyLabel}</Kbd>
      </button>
    ) : (
      <button type="button" className="break-chip" aria-pressed={spikeOpen && open} aria-haspopup="dialog" disabled={disabled}>
        <ToolIcon tool="spike" />
        {def.chip}
        {current !== 1 ? <span className="break-tool-val">{formatMultiplier(current)}</span> : null}
      </button>
    );

  const rounded = Math.round(value);
  return (
    <Popover
      trigger={trigger}
      open={spikeOpen && open}
      onOpenChange={(next) => breakUiFor(store).set({ spikeOpen: next, armed: null })}
      side="bottom"
      align="start"
      className="break-spike"
    >
      <div role="group" aria-label="Traffic spike">
        <div className="break-spike-read">
          <span id={readoutId}>Traffic multiplier</span>
          <b aria-hidden="true">{formatMultiplier(rounded)}</b>
        </div>
        <div onPointerUp={() => commands.apply('spike', null, rounded)}>
          <Slider
            aria-label={`Traffic multiplier, 1× to ${cap}×`}
            value={value}
            min={1}
            max={cap}
            scale="log"
            onValueChange={setValue}
          />
        </div>
        <div className="break-spike-ticks" aria-hidden="true">
          {spikeTicks(cap).map((t) => (
            <span key={t} style={{ left: `${(Math.log(t) / Math.log(cap)) * 100}%` }}>
              {t}×
            </span>
          ))}
        </div>
        <p className="break-spike-note">Applies on release. Now {formatMultiplier(current)}.</p>
        <div className="break-spike-acts">
          {current !== 1 ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => commands.apply('spike', null, 1)}>
              Back to 1×
            </Button>
          ) : null}
          <Button type="button" variant="glass" size="sm" className={cn('ml-auto')} onClick={() => commands.apply('spike', null, rounded)}>
            Apply {formatMultiplier(rounded)}
          </Button>
        </div>
      </div>
    </Popover>
  );
}

function spikeTicks(cap: number): number[] {
  const ticks = [1, 5, 20, 50, 100].filter((t) => t < cap);
  return [...ticks, cap];
}
