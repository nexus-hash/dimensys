'use client';

import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { enterSubsystem, exitSubsystem } from '../store/playerStore';
import { drillKey } from './drill';

export interface DrillStageProps {
  /** The top level's own label — used only for the live-region announcement. */
  rootLabel: string;
  /** Subsystem id → label, for every drillable subsystem anywhere in the diagram (any depth). */
  labelsById: Record<string, string>;
  className?: string;
  /**
   * One `<div data-drill-key="…">` per level (root's key is `""`), each
   * wrapping that level's own `<StaticBlueprint>` — pre-rendered server-side
   * by `DrilldownBlueprint`. This component only toggles which one is
   * visible; it draws nothing itself.
   */
  children: ReactNode;
}

const EXIT_FALLBACK_MS = 700; // safety net if `animationend` never fires (animations disabled some other way, a hidden tab, …).

/**
 * The player's subsystem drill-down (T3.4): shows exactly one pre-rendered
 * level at a time, drives the enter/exit transition (a plain CSS
 * animation — `app/globals.css`'s blanket reduced-motion rule already
 * collapses it under `prefers-reduced-motion`/`data-motion="off"`, so there's
 * no separate reduced-motion branch here), and keeps focus and an aria-live
 * announcement in step.
 *
 * Entry points, both delegated from one click/keydown listener on the stage
 * (the canvas kit's SVG pieces are pure presentation with no handlers of
 * their own): a collapsed subsystem (`data-node-id` matching a known
 * subsystem id) or an expanded frame's tab (`data-subsystem-tab-id`).
 *
 * The breadcrumb trail itself (T3.16) is a standalone `<Breadcrumbs>` in the
 * shell's top bar, not here — it reads `drill` from the same store and calls
 * `goToDrillDepth` directly. Navigating from a breadcrumb still lands on
 * this component's own `activeKey` effect (it fires on any `drill` change,
 * regardless of who called `setState`); the one thing it loses versus an
 * in-stage click is `pendingFocusIdRef`'s "return focus to the exact
 * trigger" — a breadcrumb click instead focuses the landing level itself,
 * which is an acceptable trade for keeping the crumb trail out of the canvas
 * area per the layout decision that nothing overlaps the diagram.
 */
export function DrillStage({ rootLabel, labelsById, className, children }: DrillStageProps) {
  const drill = usePlayerStore((s) => s.drill);
  const store = usePlayerStoreApi();
  const stageRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const prevDrillRef = useRef<readonly string[]>([]);
  // The element that triggered entry into each subsystem id, so exiting can
  // return focus to it (a breadcrumb click has no such element — it falls
  // back to the level's own group in that case).
  const triggerRef = useRef<Map<string, HTMLElement>>(new Map());
  // Set right before an ascending `setState` (Escape / a breadcrumb click) so
  // the effect below — which is what actually un-hides the target level —
  // can focus the *specific* trigger element once that level is ready,
  // instead of racing it with a separately-scheduled callback.
  const pendingFocusIdRef = useRef<string | undefined>(undefined);
  // A per-level generation counter. A level can flip enter→leave→enter
  // faster than its *previous* phase's callbacks (the `animationend`
  // listener, and the `EXIT_FALLBACK_MS` timer that's a safety net for a
  // missed one) resolve — a real reduced-motion run hit exactly this: a fast
  // re-entry's leftover leave-settle fired mid-transition and forced
  // `hidden = true` back onto a level a newer transition had already made
  // visible again. Every phase captures the element's generation at the
  // moment it starts; its callbacks check it's still current before doing
  // anything, so a stale one — whichever of the two fires — is a no-op.
  const levelGenerationRef = useRef<Map<HTMLElement, number>>(new Map());

  const activeKey = drillKey(drill);

  function beginPhase(el: HTMLElement): number {
    const gen = (levelGenerationRef.current.get(el) ?? 0) + 1;
    levelGenerationRef.current.set(el, gen);
    return gen;
  }
  function isCurrentPhase(el: HTMLElement, gen: number): boolean {
    return levelGenerationRef.current.get(el) === gen;
  }

  useEffect(() => {
    const stage = stageRef.current;
    const prevDrill = prevDrillRef.current;
    prevDrillRef.current = drill;
    const prevKey = drillKey(prevDrill);
    if (!stage || prevKey === activeKey) return;
    // Descending (entered deeper) auto-focuses the new level itself.
    // Ascending (Escape / a breadcrumb) focuses the specific trigger element
    // recorded for the subsystem just left, when one was recorded.
    const descending = drill.length > prevDrill.length;
    const pendingFocusId = pendingFocusIdRef.current;
    pendingFocusIdRef.current = undefined;

    const levels = Array.from(stage.querySelectorAll<HTMLElement>('[data-drill-key]'));
    const nextEl = levels.find((el) => el.dataset.drillKey === activeKey);
    const prevEl = levels.find((el) => el.dataset.drillKey === prevKey);

    if (nextEl) {
      const gen = beginPhase(nextEl);
      nextEl.hidden = false;
      nextEl.classList.add('is-entering');
      const clear = () => {
        if (!isCurrentPhase(nextEl, gen)) return;
        nextEl.classList.remove('is-entering');
      };
      nextEl.addEventListener('animationend', clear, { once: true });
      window.setTimeout(clear, EXIT_FALLBACK_MS);
      if (descending) {
        nextEl.focus();
      } else {
        ((pendingFocusId && triggerRef.current.get(pendingFocusId)) || nextEl).focus();
      }
    }
    if (prevEl && prevEl !== nextEl) {
      const gen = beginPhase(prevEl);
      prevEl.classList.add('is-leaving');
      const settle = () => {
        if (!isCurrentPhase(prevEl, gen)) return;
        prevEl.classList.remove('is-leaving');
        prevEl.hidden = true;
      };
      prevEl.addEventListener('animationend', settle, { once: true });
      window.setTimeout(settle, EXIT_FALLBACK_MS);
    }

    if (liveRef.current) {
      const label = drill.length === 0 ? rootLabel : (labelsById[drill[drill.length - 1]] ?? drill[drill.length - 1]);
      liveRef.current.textContent = drill.length === 0 ? `Back to ${label}` : descending ? `Entered ${label}` : `At ${label}`;
    }
    // `drill`/`rootLabel`/`labelsById` are read for the announcement only; the
    // effect's real trigger is `activeKey` (derived from `drill`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  function enter(id: string, trigger: HTMLElement) {
    triggerRef.current.set(id, trigger);
    store.setState((s) => enterSubsystem(s, id));
  }

  function isSubsystemId(id: string | undefined): id is string {
    return !!id && id in labelsById;
  }

  function activateFromTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const tab = target.closest<HTMLElement>('[data-subsystem-tab-id]');
    if (tab?.dataset.subsystemTabId) {
      enter(tab.dataset.subsystemTabId, tab);
      return true;
    }
    const node = target.closest<HTMLElement>('[data-node-id]');
    if (isSubsystemId(node?.dataset.nodeId)) {
      enter(node!.dataset.nodeId!, node!);
      return true;
    }
    return false;
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    activateFromTarget(event.target);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      if (drill.length === 0) return;
      event.preventDefault();
      pendingFocusIdRef.current = drill[drill.length - 1];
      store.setState((s) => exitSubsystem(s));
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (activateFromTarget(event.target)) event.preventDefault();
  }

  return (
    <div className={className}>
      <div ref={stageRef} className="player-drill-stage" onClick={handleClick} onKeyDown={handleKeyDown}>
        {children}
      </div>
      <div ref={liveRef} aria-live="polite" role="status" className="sr-only" />
    </div>
  );
}
