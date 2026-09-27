import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useShortcut } from '../useShortcut';
import { shortcutRegistry } from '../registry';

function makeEvent(key: string): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: () => {},
    target: document.body,
    key,
  } as unknown as KeyboardEvent;
}

function Registrant({ id, onFire, enabled }: { id: string; onFire: () => void; enabled?: boolean }) {
  useShortcut({ id, keys: ']', label: 'Faster', group: 'Player' }, onFire, enabled);
  return null;
}

describe('useShortcut enabled param', () => {
  afterEach(() => {
    for (const def of shortcutRegistry.list()) shortcutRegistry.unregister(def.id);
  });

  it('registers by default (enabled omitted)', () => {
    const fire = vi.fn();
    render(<Registrant id="s1" onFire={fire} />);
    shortcutRegistry.dispatch(']', makeEvent(']'));
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('does not register at all when enabled=false — dispatch never reaches its handler', () => {
    const fire = vi.fn();
    render(<Registrant id="s2" onFire={fire} enabled={false} />);
    shortcutRegistry.dispatch(']', makeEvent(']'));
    expect(fire).not.toHaveBeenCalled();
    // Confirms it's a non-registration, not a silently-skipped handler:
    // the id never entered the registry's live entries at all.
    expect(shortcutRegistry.list().some((d) => d.id === 's2')).toBe(false);
  });

  /**
   * Regression test for the bug this parameter fixes (found while building
   * `PlaybackControls`, T3.8): the registry keys its live entries by `id`
   * alone, so two mounted callers passing the *same* id — one meant to own
   * the binding, one a duplicate UI copy (e.g. the phone sheet's own
   * `TimelineDock`) — used to both register regardless of a `hidden` flag,
   * and whichever mounted/re-rendered last silently won that id's map
   * slot. If that happened to be the non-owning copy's no-op handler, the
   * key stopped doing anything at all, even though the owning instance's
   * button still worked. `enabled=false` on the non-owning copy means it
   * never registers, so only the owning instance's handler is ever in the
   * map, regardless of mount/render order.
   */
  it('two instances sharing one id: the disabled one never shadows the enabled one, in either mount order', () => {
    const owner = vi.fn();
    const duplicate = vi.fn();

    // Duplicate (disabled) mounts first, owner second — the order that
    // triggered the original bug (later registration used to win).
    const { rerender } = render(
      <>
        <Registrant id="dup-1" onFire={duplicate} enabled={false} />
      </>,
    );
    rerender(
      <>
        <Registrant id="dup-1" onFire={duplicate} enabled={false} />
        <Registrant id="dup-1" onFire={owner} enabled />
      </>,
    );

    shortcutRegistry.dispatch(']', makeEvent(']'));
    expect(owner).toHaveBeenCalledTimes(1);
    expect(duplicate).not.toHaveBeenCalled();
  });
});
