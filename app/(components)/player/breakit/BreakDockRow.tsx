'use client';

/**
 * The Break it row in the dock under the board, above the transport. Before
 * the first move: "Try this" cards (the diagram’s own ideas, then
 * generic ones for its caches). After it: the action log, newest last, each
 * move with its sim time and, while it's still in effect, an Undo.
 */
import { usePlayerStore } from '../store/PlayerStoreProvider';
import { fmtSimTime } from '../metrics/simTime';
import { useBreakData } from './BreakContext';
import { useBreakCommands } from './useBreakCommands';
import { ToolIcon, UndoIcon, WrenchIcon } from './icons';
import { describeAction, tryCards, undoPlan } from './tools';
import type { UserAction } from '../types';

/** How many of the latest moves the row shows (the full log is the share link's). */
const LOG_ROWS = 4;

export function BreakDockRow() {
  const mode = usePlayerStore((s) => s.mode);
  const { kit } = useBreakData();
  const actions = usePlayerStore((s) => s.actions);
  if (mode !== 'break' || !kit) return null;
  return actions.length === 0 ? <TryCards /> : <ActionLog actions={actions} />;
}

function TryCards() {
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  const cards = tryCards(data.kit, data.catalog);
  if (cards.length === 0) return null;
  return (
    <div className="break-try" role="group" aria-label="Try this">
      <span className="break-try-k">Try this</span>
      {cards.map((c) => (
        <button key={c.key} type="button" className="break-try-card" disabled={!ready} onClick={() => commands.apply(c.tool, c.target, c.value)}>
          <ToolIcon tool={c.tool} />
          <span>{c.text}</span>
        </button>
      ))}
    </div>
  );
}

export function ActionLog({ actions, full = false }: { actions: readonly UserAction[]; full?: boolean }) {
  const data = useBreakData();
  const commands = useBreakCommands(data);
  const ready = usePlayerStore((s) => s.sim.status === 'ready');
  const start = full ? 0 : Math.max(0, actions.length - LOG_ROWS);
  const shown = actions.slice(start);
  return (
    <div className="break-log" role="group" aria-label="Your changes">
      <span className="break-try-k">Your changes</span>
      <ol className="break-log-list">
        {shown.map((a, i) => {
          const index = start + i;
          const plan = undoPlan(actions, index);
          const text = describeAction(a, data.catalog, data.remedies, data.switches);
          return (
            <li key={index} className="break-log-item" data-tool={a[1]}>
              <span className="break-log-t">{fmtSimTime(a[0])}</span>
              {a[1] === 'intervention' ? <WrenchIcon className="break-log-ic" /> : isTool(a[1]) ? <ToolIcon tool={a[1]} className="break-log-ic" /> : null}
              <span className="break-log-text">{text}</span>
              {plan ? (
                <button type="button" className="break-log-undo" disabled={!ready} onClick={() => commands.undo(index)} aria-label={`Undo: ${text}`}>
                  <UndoIcon />
                  Undo
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function isTool(tool: string): tool is 'kill' | 'spike' | 'partition' | 'slow' | 'flush' {
  return tool === 'kill' || tool === 'spike' || tool === 'partition' || tool === 'slow' || tool === 'flush';
}
