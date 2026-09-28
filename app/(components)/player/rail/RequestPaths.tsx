'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMs, formatRps } from '@/app/(components)/data';
import { usePlayerStore } from '../store/PlayerStoreProvider';
import type { SimSlice } from '../store/playerStore';
import type { RailLane } from './data';
import { traceOnBoard } from './trace';

/** "3.9k/s · p99 12 ms" from the latest frame, or empty before one arrives. */
export function laneStat(sim: Pick<SimSlice, 'frame' | 'metricKeys'>, probes: RailLane['probes']): string {
  if (!probes || !sim.frame) return '';
  const read = (key: string) => {
    const i = sim.metricKeys.indexOf(key);
    return i < 0 ? undefined : sim.frame!.metrics[i];
  };
  const rps = read(probes[0]);
  const p99 = read(probes[1]);
  const parts: string[] = [];
  if (rps !== undefined && Number.isFinite(rps)) parts.push(`${formatRps(rps)}/s`);
  if (p99 !== undefined && Number.isFinite(p99)) parts.push(`p99 ${formatMs(p99)} ms`);
  return parts.join(' · ');
}

function LaneStat({ probes }: { probes: RailLane['probes'] }) {
  const text = usePlayerStore((s) => laneStat(s.sim, probes));
  return (
    <span className="rail-lane-stat" data-lane-stat>
      {text}
    </span>
  );
}

/**
 * The diagram's request paths. Hovering or focusing one traces it on the
 * board (its nodes and links lit, the rest dimmed); a click pins the trace,
 * which is also how touch reaches it. Tracing is off while a walkthrough
 * owns the board.
 */
export function RequestPaths({ lanes }: { lanes: readonly RailLane[] }) {
  const walking = usePlayerStore((s) => s.mode === 'walkthrough');
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [wasWalking, setWasWalking] = useState(walking);
  const listRef = useRef<HTMLUListElement>(null);

  // A walkthrough starting drops the pinned trace.
  if (walking !== wasWalking) {
    setWasWalking(walking);
    if (walking) setPinned(null);
  }

  const shown = walking ? null : (hovered ?? focused ?? pinned);

  useEffect(() => {
    const root = listRef.current?.closest('.player-shell');
    if (!root) return;
    const lane = shown ? lanes.find((l) => l.id === shown) : undefined;
    traceOnBoard(root, lane ?? null);
  }, [shown, lanes]);

  useEffect(() => {
    const root = listRef.current?.closest('.player-shell');
    return () => {
      if (root) traceOnBoard(root, null);
    };
  }, []);

  return (
    <ul ref={listRef} className="grid gap-1.5" data-rail-lanes>
      {lanes.map((lane) => (
        <li key={lane.id}>
          <button
            type="button"
            className="rail-lane"
            data-lane={lane.id}
            aria-pressed={pinned === lane.id}
            aria-disabled={walking || undefined}
            data-traced={shown === lane.id || undefined}
            onMouseEnter={() => setHovered(lane.id)}
            onMouseLeave={() => setHovered((h) => (h === lane.id ? null : h))}
            onFocus={() => setFocused(lane.id)}
            onBlur={() => setFocused((f) => (f === lane.id ? null : f))}
            onClick={() => {
              if (!walking) setPinned((p) => (p === lane.id ? null : lane.id));
            }}
          >
            <span className="rail-lane-top">
              <b>{lane.text}</b>
              <LaneStat probes={lane.probes} />
            </span>
            <span className="rail-lane-hops">{lane.chain}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
