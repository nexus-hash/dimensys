'use client';

/**
 * Break It's always-mounted behaviour, with no visible markup of its own:
 *
 * - **Targeting.** While a tool is armed, a click or Enter on a board node
 *   or link applies it (or explains why it can't), instead of selecting.
 *   Every node and link is marked as a valid target or not, so the valid
 *   ones take the crosshair and hover ring and the rest show not-allowed.
 *   A click on empty board, or Esc, disarms.
 * - **Keys.** K / ↑ / P / S / F in Break it: with a fitting selection the
 *   tool applies to it straight away (the "select a node and press the
 *   key" path), otherwise it arms (or, for Spike, opens its slider).
 * - **Faults on the board.** A cut link is drawn cut (dashed, with a
 *   scissors mark) for as long as the log leaves it cut; killed nodes get
 *   the down hatch from the simulation's own "up" reading.
 * - **Session upkeep.** Leaving Break it disarms and closes the Fix it
 *   panel; a reset clears the fixes' before-readings; the Fix it panel
 *   opens itself once, the first time a requirement fails after a move.
 */
import { useEffect, useRef } from 'react';
import { useShortcut, useShortcutScope } from '@/app/(components)/command';
import { toast } from '@/app/(components)/ui';
import { usePlayerStore, usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { XML_NS } from '../overlay/xmlNs';
import { useBreakData } from './BreakContext';
import { breakUiFor, useBreakUi } from './breakStore';
import { useBreakCommands } from './useBreakCommands';
import { getBridge } from '../worker/bridgeRegistry';
import { CACHE_TOOL, packFor, packTargets } from './pack';
import {
  DEFAULT_SPIKE,
  SLOW_FACTOR,
  canTarget,
  deriveFaults,
  offeredTools,
  toolDef,
  whyNot,
  type BoardTarget,
  type BreakTool,
} from './tools';

/** Phone layout (the chips row, not the toolbox, carries the tools there). */
export function isPhoneLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches === true;
}

function boardTargetOf(el: Element | null): { target: BoardTarget; el: Element } | null {
  if (!el) return null;
  const node = el.closest<HTMLElement>('[data-node-id]');
  if (node?.dataset.nodeId) return { target: { kind: 'node', id: node.dataset.nodeId }, el: node };
  const link = el.closest<HTMLElement>('[data-link-id]');
  if (link?.dataset.linkId) return { target: { kind: 'link', id: link.dataset.linkId }, el: link };
  return null;
}

/** The value a tool is sent with. */
export function toolValue(tool: BreakTool, spike: number = DEFAULT_SPIKE): number | null {
  if (tool === 'spike') return spike;
  if (tool === 'slow') return SLOW_FACTOR;
  return null;
}

export function BreakController() {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const store = usePlayerStoreApi();
  const data = useBreakData();
  const { kit, catalog } = data;
  const commands = useBreakCommands(data);
  const mode = usePlayerStore((s) => s.mode);
  const armed = useBreakUi((s) => s.armed);
  const breaking = mode === 'break' && !!kit;

  // ---- leaving Break it: disarm, close the panel and the spike slider ----
  useEffect(() => {
    if (!breaking) breakUiFor(store).set({ armed: null, spikeOpen: false, cacheOpen: false, drawer: false });
  }, [breaking, store]);

  // ---- a move handed over (a walkthrough's failure): made once the free-play run is up ----
  // Entering Break it from a scenario restarts the run first, so this waits until the
  // scenario is gone and the new run is ready. It starts from healthy: any earlier moves go.
  const pending = useBreakUi((s) => s.pending);
  const status = usePlayerStore((s) => s.sim.status);
  const scenario = usePlayerStore((s) => s.story.scenarioId);
  useEffect(() => {
    if (!pending || !breaking || status !== 'ready' || scenario) return;
    breakUiFor(store).set({ pending: null, marks: {}, plan: null });
    if (store.getState().actions.length > 0) getBridge(store)?.reset();
    commands.apply(pending.tool, pending.target, pending.value);
  }, [pending, breaking, status, scenario, store, commands]);

  // ---- targeting: mark targets, intercept clicks/Enter/Esc while armed ----
  useEffect(() => {
    const root = anchorRef.current?.closest<HTMLElement>('[data-player-root]');
    if (!root) return;
    const groups = root.querySelectorAll<SVGGElement>('[data-node-id], [data-link-id]');
    if (!armed || !breaking) {
      delete root.dataset.breakArmed;
      for (const g of groups) g.removeAttribute('data-break-ok');
      return;
    }
    root.dataset.breakArmed = armed;
    for (const g of groups) {
      const hit = boardTargetOf(g);
      g.setAttribute('data-break-ok', String(!!hit && canTarget(armed, hit.target, catalog, kit)));
    }

    function applyTo(target: BoardTarget) {
      const tool = armed!;
      const reason = whyNot(tool, target, catalog, kit);
      if (reason) {
        toast(reason);
        return;
      }
      commands.apply(tool, target.id, toolValue(tool));
    }

    function onClickCapture(e: MouseEvent) {
      if (!(e.target instanceof Element) || !e.target.closest('.player-board-wrap')) return;
      e.stopPropagation();
      e.preventDefault();
      const hit = boardTargetOf(e.target);
      if (hit) applyTo(hit.target);
      else breakUiFor(store).set({ armed: null });
    }
    function onKeyCapture(e: KeyboardEvent) {
      if (e.target instanceof Element && e.target.closest('[data-radix-popper-content-wrapper]')) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        breakUiFor(store).set({ armed: null });
        return;
      }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!(e.target instanceof Element) || !root!.contains(e.target) || !e.target.closest('.player-board-wrap')) return;
      const hit = boardTargetOf(e.target);
      if (!hit) return;
      e.stopPropagation();
      e.preventDefault();
      applyTo(hit.target);
    }
    root.addEventListener('click', onClickCapture, true);
    window.addEventListener('keydown', onKeyCapture, true);
    return () => {
      root.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('keydown', onKeyCapture, true);
      delete root.dataset.breakArmed;
      for (const g of groups) g.removeAttribute('data-break-ok');
    };
  }, [armed, breaking, catalog, kit, commands, store]);

  // ---- faults on the board, reset upkeep, the one-time Fix it auto-open ----
  useEffect(() => {
    const root = anchorRef.current?.closest<HTMLElement>('[data-player-root]');
    if (!root) return;
    let lastActions = store.getState().actions;
    let lastWatches = store.getState().sim.watches;
    const drawn = new Set<string>();

    function drawCuts(cut: ReadonlySet<string>) {
      for (const id of [...drawn]) {
        if (cut.has(id)) continue;
        const g = root!.querySelector<SVGGElement>(`[data-link-id="${CSS.escape(id)}"]`);
        g?.querySelector('path.cv-link')?.classList.remove('is-cut');
        g?.querySelector('.break-cut-mark')?.remove();
        drawn.delete(id);
      }
      for (const id of cut) {
        if (drawn.has(id)) continue;
        const g = root!.querySelector<SVGGElement>(`[data-link-id="${CSS.escape(id)}"]`);
        const path = g?.querySelector<SVGPathElement>('path.cv-link');
        if (!g || !path) continue;
        path.classList.add('is-cut');
        let mid = { x: 0, y: 0 };
        try {
          const p = path.getPointAtLength(path.getTotalLength() / 2);
          mid = { x: p.x, y: p.y };
        } catch {
          continue;
        }
        const mark = document.createElementNS(XML_NS, 'g');
        mark.setAttribute('class', 'break-cut-mark');
        mark.setAttribute('transform', `translate(${mid.x}, ${mid.y})`);
        mark.setAttribute('aria-hidden', 'true');
        mark.innerHTML =
          '<circle r="10"/><path d="M-4 -5 L4 5 M4 -5 L-4 5" transform="scale(.8)"/>';
        g.appendChild(mark);
        drawn.add(id);
      }
    }

    const unsubscribe = store.subscribe(() => {
      const s = store.getState();
      if (s.actions !== lastActions) {
        const hadActions = lastActions.length > 0;
        lastActions = s.actions;
        drawCuts(deriveFaults(s.actions).cut);
        if (hadActions && s.actions.length === 0) breakUiFor(store).set({ marks: {}, armed: null });
      }
      if (s.sim.watches !== lastWatches) {
        const failedNow = Object.entries(s.sim.watches).some(([id, pass]) => !pass && lastWatches[id] !== false);
        lastWatches = s.sim.watches;
        const ui = breakUiFor(store);
        if (failedNow && s.mode === 'break' && s.actions.length > 0 && !ui.get().autoOpened && !isPhoneLayout()) {
          ui.set({ drawer: true, tab: 'fix', autoOpened: true });
        }
      }
    });
    drawCuts(deriveFaults(store.getState().actions).cut);
    return () => {
      unsubscribe();
      drawCuts(new Set());
    };
  }, [store]);

  // ---- keys ----
  useShortcutScope('player-break', breaking);
  const offered = new Set(offeredTools(kit).map((t) => t.id));

  function onToolKey(tool: BreakTool, event: KeyboardEvent) {
    if (!offered.has(tool)) return;
    // Letters typed into an open list (the target picker's type-ahead) or popover belong to it.
    if (event.target instanceof Element && event.target.closest('[data-radix-popper-content-wrapper], [role="dialog"]')) return;
    event.preventDefault();
    const ui = breakUiFor(store);
    if (tool === 'spike') {
      ui.set((s) => ({ armed: null, cacheOpen: false, spikeOpen: s.spikeOpen ? false : true }));
      return;
    }
    const sel = store.getState().selection;
    if (sel && (sel.kind === 'node' || sel.kind === 'link')) {
      const target: BoardTarget = { kind: sel.kind, id: sel.id };
      if (canTarget(tool, target, catalog, kit)) {
        commands.apply(tool, sel.id, toolValue(tool));
        return;
      }
    }
    ui.set((s) => ({ armed: s.armed === tool ? null : tool, spikeOpen: false }));
  }

  useShortcut({ id: 'player:break-kill', keys: toolDef('kill').combo, label: 'Break it: kill', group: 'Player', when: 'player-break', hidden: !offered.has('kill') }, (e) =>
    onToolKey('kill', e),
  );
  useShortcut(
    { id: 'player:break-spike', keys: toolDef('spike').combo, label: 'Break it: traffic spike', group: 'Player', when: 'player-break', hidden: !offered.has('spike') },
    (e) => {
      // Arrow keys pan the board while it has focus; the spike key only works from elsewhere.
      if (e.target instanceof Element && e.target.closest('.player-board-stage')) return;
      onToolKey('spike', e);
    },
  );
  useShortcut(
    { id: 'player:break-partition', keys: toolDef('partition').combo, label: 'Break it: partition a link', group: 'Player', when: 'player-break', hidden: !offered.has('partition') },
    (e) => onToolKey('partition', e),
  );
  useShortcut({ id: 'player:break-slow', keys: toolDef('slow').combo, label: 'Break it: slow', group: 'Player', when: 'player-break', hidden: !offered.has('slow') }, (e) =>
    onToolKey('slow', e),
  );
  useShortcut({ id: 'player:break-flush', keys: toolDef('flush').combo, label: 'Break it: flush a cache', group: 'Player', when: 'player-break', hidden: !offered.has('flush') }, (e) =>
    onToolKey('flush', e),
  );

  // C: the cache failures, for the selected cache when one is selected.
  const hasPacks = packTargets(kit, catalog).length > 0;
  useShortcut(
    { id: 'player:break-cache', keys: CACHE_TOOL.combo, label: 'Break it: cache failures', group: 'Player', when: 'player-break', hidden: !hasPacks },
    (e) => {
      if (!hasPacks) return;
      if (e.target instanceof Element && e.target.closest('[data-radix-popper-content-wrapper], [role="dialog"]')) return;
      e.preventDefault();
      const sel = store.getState().selection;
      const onCache = sel?.kind === 'node' && packFor(kit, sel.id) ? sel.id : null;
      breakUiFor(store).set((s) => ({ armed: null, spikeOpen: false, cacheOpen: !s.cacheOpen, ...(onCache ? { cacheTarget: onCache } : {}) }));
    },
  );

  return <span ref={anchorRef} hidden />;
}
