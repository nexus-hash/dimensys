'use client';

/**
 * Taking a failure back without resetting everything. A dead node, a cut
 * link, a slow-down, a spike or a cache failure stays until it's undone
 * (only a flush refills by itself), so every one in effect gets its own
 * Restore: listed at the top of Fix it, and on a dead node's inspector.
 * Restoring is an ordinary move: it joins the log, and fixes stay in.
 */
import { Button } from '@/app/(components)/ui';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { useBreakData } from './BreakContext';
import { useBreakCommands } from './useBreakCommands';
import { UndoIcon } from './icons';
import { describeAction, failuresInEffect, killEntryIndex, targetName } from './tools';

/** "Broken now": every failure still in effect, each with a Restore. Nothing when nothing is broken. */
export function BrokenNow() {
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const actions = usePlayerStore((s) => s.actions);
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  const live = failuresInEffect(actions);
  if (live.length === 0) return null;
  return (
    <section className="break-now" aria-label="Broken now">
      <p className="break-fixit-k">Broken now</p>
      <ul className="break-now-list">
        {live.map((index) => {
          const text = describeAction(actions[index], data.catalog, data.remedies, data.switches, data.kit);
          return (
            <li key={index} className="break-now-item" data-tool={actions[index][1]} data-target={actions[index][2] ?? ''}>
              <span className="break-now-text">{text}</span>
              <Button type="button" variant="ghost" size="sm" disabled={!ready} onClick={() => commands.undo(index)} aria-label={`Restore: ${text}`}>
                <UndoIcon />
                Restore
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** On a dead node's inspector: it's down, and a way to bring it back. Nothing while it's up. */
export function RestoreNode({ id }: { id: string }) {
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const index = usePlayerStore((s) => killEntryIndex(s.actions, id));
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  if (index < 0) return null;
  const name = targetName({ id }, data.catalog);
  return (
    <section className="break-down" aria-label={`${name} is down`}>
      <p className="break-down-t">
        <b>Down.</b> Killed in Break it, it stays down until it’s restored.
      </p>
      <Button type="button" variant="primary" size="sm" disabled={!ready} onClick={() => commands.undo(index)}>
        <UndoIcon />
        Restore {name}
      </Button>
    </section>
  );
}
