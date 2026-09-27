'use client';

/**
 * Requirement badges (T3.8): pass/fail per `NeedView` with an `alarm` (a
 * watch id the worker re-evaluates every tick — see `SimSlice.watches`),
 * rendered with the data-display kit's own `RequirementBadge`
 * (`app/(components)/data`, DS6) so the glyph/text/observed-value layout
 * matches the rail's own requirement rows exactly. 500ms hysteresis keeps a
 * flapping metric from flickering the badge. Accessible text always
 * accompanies the glyph — never color alone: `RequirementBadge` puts the
 * pass/fail word in its own text via `HealthGlyph`'s `ariaLabel`, not just
 * a border color.
 *
 * SPEC GAP: `RequirementBadge`'s `observed` line (e.g. "p99 42 ms") has
 * nothing to read from yet — `FrameMsg.watches` is a bare `[id, pass]`
 * pair, no accompanying metric value/label. Left blank (the component's own
 * em-dash fallback) until the worker protocol carries one; reported here
 * rather than guessing which raw metric backs a given watch id.
 */
import { useEffect, useRef, useState } from 'react';
import { RequirementBadge } from '@/app/(components)/data';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import type { NeedView } from '../types';

export interface RequirementBadgesProps {
  needs: readonly NeedView[];
}

const HYSTERESIS_MS = 500;

export function RequirementBadges({ needs }: RequirementBadgesProps) {
  if (needs.length === 0) return null;
  return (
    <div className="hud-req-badges" role="group" aria-label="Requirements">
      {needs.map((need) => (
        <LiveRequirementBadge key={need.id} need={need} />
      ))}
    </div>
  );
}

function LiveRequirementBadge({ need }: { need: NeedView }) {
  const rawPass = usePlayerStore((s) => (need.alarm ? s.sim.watches[need.alarm] : undefined));
  const shown = useHysteresis(rawPass, HYSTERESIS_MS);

  const status = !need.alarm ? 'not-simulated' : shown === undefined ? 'pending' : shown ? 'pass' : 'fail';

  return <RequirementBadge text={need.chip ?? need.text} status={status} />;
}

/**
 * Debounces a boolean|undefined signal: a change is only accepted once it's
 * been stable for `delayMs`, mirroring the design spec's debounce
 * (`since`/`pend` bookkeeping), just as a hook instead of a per-id record in
 * a plain object.
 */
function useHysteresis(value: boolean | undefined, delayMs: number): boolean | undefined {
  const [shown, setShown] = useState(value);
  const pending = useRef<{ value: boolean | undefined; timer: ReturnType<typeof setTimeout> | null }>({
    value,
    timer: null,
  });

  useEffect(() => {
    if (value === shown) {
      if (pending.current.timer) {
        clearTimeout(pending.current.timer);
        pending.current.timer = null;
      }
      pending.current.value = value;
      return;
    }
    if (pending.current.value === value && pending.current.timer) return; // already waiting on this exact value
    if (pending.current.timer) clearTimeout(pending.current.timer);
    pending.current.value = value;
    const box = pending.current;
    box.timer = setTimeout(() => {
      setShown(value);
      box.timer = null;
    }, delayMs);
    return () => {
      if (box.timer) clearTimeout(box.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return shown;
}
