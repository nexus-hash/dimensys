'use client';

import './story.css';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Kbd, Pill, useReducedMotion } from '@/app/(components)/ui';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useHudReadings } from '../hud/HudTiles';
import { fmtSimTime } from '../metrics/simTime';
import { useIsPhone } from '../breakit';
import { useStoryData } from './StoryContext';
import { chooseAnswer, keepWatching } from './actions';
import { useOpenAsk } from './useOpenAsk';
import { RichText } from './RichText';
import type { Ask } from './model';

/**
 * The checkpoint card: where a paused scenario asks "What would you do?".
 * Desktop and tablet show it in the dock under the board (in place of the
 * narration card); phone shows it in the bottom sheet. `where` names the
 * copy's host so exactly one is ever mounted.
 */
export function CheckpointSlot({ where }: { where: 'dock' | 'sheet' }) {
  const ask = useOpenAsk();
  const phone = useIsPhone();
  if (!ask || (where === 'sheet') !== phone) return null;
  return <CheckpointCard key={ask.id} ask={ask} />;
}

/** How long the picked choice stays marked before the card closes. */
const PICK_MS = 200;

function CheckpointCard({ ask }: { ask: Ask }) {
  const store = usePlayerStoreApi();
  const { gauges } = useStoryData();
  const readings = useHudReadings(gauges);
  const reduced = useReducedMotion();
  const qId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const picks = ask.picks;

  // Focus moves into the card when it opens and goes back where it was
  // (or to the play button) when it closes.
  useEffect(() => {
    const root = rootRef.current;
    const before = document.activeElement instanceof HTMLElement && !root?.contains(document.activeElement) ? document.activeElement : null;
    // In the phone sheet the tab may be scrolled down its list: the card
    // leads the tab, so scroll back to the top (tabs and question in view).
    if (root && root.closest('[role="dialog"]')) scrollParent(root)?.scrollTo({ top: 0 });
    const first = root?.querySelector<HTMLButtonElement>('[data-choice]');
    first?.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      if (active && active !== document.body && document.contains(active)) return;
      const target = before && before.isConnected && before.getClientRects().length > 0 ? before : visiblePlayButton();
      target?.focus({ preventScroll: true });
    };
  }, []);

  function pick(choiceId: string) {
    if (picked) return;
    setPicked(choiceId);
    window.setTimeout(() => chooseAnswer(store, ask.id, choiceId), reduced ? 0 : PICK_MS);
  }

  // The player's own shortcuts (1–5 switch modes, Space plays) listen on the
  // document, the same node React listens on: stopping the key there takes
  // `stopImmediatePropagation`, not just `stopPropagation`.
  function claim(event: KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const n = Number(event.key);
    if (Number.isInteger(n) && n >= 1 && n <= picks.length) {
      event.preventDefault();
      claim(event);
      pick(picks[n - 1].id);
      return;
    }
    // Space and Enter press the focused button here; they must not also
    // play or pause the run.
    if (event.key === ' ' || event.key === 'Enter') claim(event);
  }

  const shown = readings.filter((r) => r.value !== '—');

  return (
    <section ref={rootRef} className="cp-card" aria-labelledby={qId} data-checkpoint={ask.id} onKeyDown={onKeyDown}>
      <div className="cp-eyebrow">
        <Pill>checkpoint · {fmtSimTime(ask.t)}</Pill>
        <span>What would you do?</span>
      </div>
      <h2 id={qId} className="cp-q">
        <RichText text={ask.md} />
      </h2>
      {shown.length > 0 ? (
        <p className="cp-ctx">
          Now:{' '}
          {shown.map((r, i) => (
            <span key={r.key}>
              {i > 0 ? ' · ' : ''}
              {r.shortLabel} <b className="v">{withUnit(r.value, r.unit)}</b>
            </span>
          ))}
        </p>
      ) : null}
      <div className="cp-choices" role="group" aria-label="Choices">
        {picks.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="cp-choice"
            data-choice={p.id}
            data-picked={picked === p.id || undefined}
            aria-keyshortcuts={String(i + 1)}
            disabled={picked !== null && picked !== p.id}
            onClick={() => pick(p.id)}
            style={{ animationDelay: `${80 + i * 30}ms` }}
          >
            <Kbd className="cp-kbd">{i + 1}</Kbd>
            <span className="min-w-0">
              <b>{p.text}</b>
              {p.real ? <span className="cp-choice-sub">what the team did</span> : null}
            </span>
          </button>
        ))}
      </div>
      <div className="cp-foot">
        <span className="cp-foot-hint">
          Paused at {fmtSimTime(ask.t)} on the scenario timeline · press <Kbd>1</Kbd>–<Kbd>{picks.length}</Kbd>
        </span>
        <Button variant="ghost" size="sm" disabled={picked !== null} onClick={() => keepWatching(store, ask.id)}>
          Keep watching
        </Button>
      </div>
    </section>
  );
}

/** `395 ms`, but `38.3%` and `$2,774/mo`. */
function withUnit(value: string, unit: string): string {
  if (!unit) return value;
  return /^[%/]/.test(unit) ? `${value}${unit}` : `${value} ${unit}`;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if ((y === 'auto' || y === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

function visiblePlayButton(): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>('[data-timeline-slot] button')) {
    if (el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled) return el;
  }
  return null;
}
