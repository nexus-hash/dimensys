import { describe, it, expect, vi } from 'vitest';
import { buildWalkthroughs, plainText } from '../model';
import { openWalkthrough, stepBy, exitWalkthrough } from '../actions';
import { WalkthroughStage, CAMERA_FOCUS_EVENT, type StageState } from '../stage';
import { createPlayerStore, initialPlayerState } from '../../store/playerStore';
import { focusCamera, fitCamera, interpolateCamera } from '../../blueprint/camera';
import type { Board, Frame, StoryView } from '../../types';

const board: Board = {
  size: [1000, 400],
  blocks: [
    { id: 'lb', form: 'lb', text: 'LB', box: [100, 200, 120, 60] },
    { id: 'api', form: 'server', text: 'API', box: [300, 200, 120, 60] },
    { id: 'kw', form: 'worker', text: 'Key worker', box: [600, 100, 120, 60] },
    { id: 'kd', form: 'db', text: 'Key DB', box: [800, 100, 120, 60] },
    { id: 'db', form: 'db', text: 'DB', box: [700, 300, 120, 60] },
  ],
  wires: [
    { id: 'l-lb-api', a: 'lb', b: 'api', line: 'sync' },
    { id: 'l-api-kw', a: 'api', b: 'kw', line: 'sync' },
    { id: 'l-kw-kd', a: 'kw', b: 'kd', line: 'sync' },
    { id: 'l-api-db', a: 'api', b: 'db', line: 'sync' },
  ],
  frames: [{ id: 'kgs', text: 'KGS', look: 'group', box: [700, 100, 360, 100], holds: ['kw', 'kd'] }],
};

function frame(partial: Partial<Frame> & { id: string }): Frame {
  return { lit: [], looks: [], pins: [], cells: [], tally: [], lines: [], ...partial };
}

const stories: StoryView[] = [
  {
    id: 'wt-write',
    text: 'Write path',
    frames: [
      frame({ id: 'w1', title: 'Validate', md: 'The **API** validates.', lit: ['lb', 'api'], trail: ['lb', 'api', 'kgs', 'db'] }),
      frame({ id: 'w2', title: 'Grab a key', lit: ['api', 'kgs'], aim: 'kgs' }),
      frame({ id: 'w3', lit: ['api', 'db'], looks: [{ el: 'db', hue: 'info' }], pins: [['p1', 'db']] }),
    ],
  },
  { id: 'empty', text: 'No frames', frames: [] },
  {
    id: 'looks-only',
    text: 'Looks only',
    frames: [
      frame({
        id: 'x1',
        looks: [
          { el: 'l-api-kw', flux: 80, hue: 'warn' },
          { el: 'l-api-db', alpha: 0.2 },
          { el: 'api', sheet: { title: 'API: handling it', parts: [{ title: 'Step 1', pane: 'overview', shape: 'prose', md: 'Validate *the* URL.' }] } },
        ],
      }),
    ],
  },
];

const walkthroughs = buildWalkthroughs({ stories, board, pins: [{ id: 'p1', text: 'row', spot: null }] });

describe('walkthrough model', () => {
  it('keeps walkthroughs with steps only, titled from the view data', () => {
    expect(walkthroughs.map((w) => w.id)).toEqual(['wt-write', 'looks-only']);
    expect(walkthroughs[0].steps.map((s) => s.title)).toEqual(['Validate', 'Grab a key', 'Step 3']);
    expect(walkthroughs[0].steps[0].summary).toBe('The API validates.');
  });

  it('lights the highlight, the link between two lit nodes, and keeps the flow path visible without lighting its ends', () => {
    const w1 = walkthroughs[0].steps[0];
    expect(w1.litNodes.sort()).toEqual(['api', 'lb']);
    expect(w1.pathLinks.sort()).toEqual(['l-api-db', 'l-api-kw', 'l-kw-kd', 'l-lb-api']);
    expect(w1.litLinks).toContain('l-api-db');
    expect(w1.focusId).toBe('lb');
  });

  it('a group target lights its members and frames them with the camera', () => {
    const w2 = walkthroughs[0].steps[1];
    expect(w2.litFrames).toEqual(['kgs']);
    expect(w2.litNodes.sort()).toEqual(['api', 'kd', 'kw']);
    expect(w2.focusId).toBe('kgs');
    expect(w2.focusAnchor).toEqual([700, 100, 360, 100]);
    // api (240..360) ∪ the frame (520..880) ∪ its members.
    const [cx, , w] = w2.focusBox!;
    expect(cx - w / 2).toBe(240);
    expect(cx + w / 2).toBe(880);
  });

  it('carries tones and markers', () => {
    const w3 = walkthroughs[0].steps[2];
    expect(w3.tones).toEqual([['db', 'info']]);
    expect(w3.markers).toEqual([['row', 'db', [700, 300, 120, 60]]]);
  });

  it('falls back to a detail panel for the title/summary; looks light, fade and carry flow', () => {
    const x1 = walkthroughs[1].steps[0];
    expect(x1.title).toBe('API: handling it');
    expect(x1.summary).toBe('Validate the URL.');
    expect(x1.pathLinks).toEqual(['l-api-kw']);
    expect(x1.fades).toEqual([['l-api-db', 0.2]]);
    expect(x1.litNodes.sort()).toEqual(['api', 'kw']);
  });

  it('plainText strips markdown marks', () => {
    expect(plainText('A [link](http://x) and `code` with **bold**')).toBe('A link and code with bold');
  });
});

describe('walkthrough actions', () => {
  const store = () =>
    createPlayerStore(initialPlayerState({ diagramId: 'd', revision: 1, hasSimulation: false, runtimeUrl: null }));

  it('opens, clamps, steps and exits', () => {
    const s = store();
    openWalkthrough(s, walkthroughs, 'wt-write', 9);
    expect(s.getState().mode).toBe('walkthrough');
    expect(s.getState().walkthrough).toEqual({ id: 'wt-write', stepIndex: 2 });
    stepBy(s, walkthroughs, 1);
    expect(s.getState().walkthrough.stepIndex).toBe(2);
    stepBy(s, walkthroughs, -1);
    stepBy(s, walkthroughs, -1);
    stepBy(s, walkthroughs, -1);
    expect(s.getState().walkthrough.stepIndex).toBe(0);
    exitWalkthrough(s);
    expect(s.getState()).toMatchObject({ mode: 'explore', walkthrough: { id: null, stepIndex: 0 } });
  });

  it('ignores an unknown walkthrough', () => {
    const s = store();
    openWalkthrough(s, walkthroughs, 'nope');
    expect(s.getState().mode).toBe('explore');
  });
});

/** A minimal drawn board: the element hooks the stage reads. */
function drawBoard(): HTMLElement {
  const root = document.createElement('div');
  const nodes = board.blocks.map((b) => `<g class="cv-node" data-node-id="${b.id}"></g>`).join('');
  const links = board.wires.map((w) => `<g class="cv-linkgroup" data-link-id="${w.id}"><path class="cv-link"></path></g>`).join('');
  const labels = board.wires.map((w) => `<g class="cv-link-label" data-link-label-for="${w.id}"></g>`).join('');
  root.innerHTML = `<div class="player-board-stage"><div data-board-level><svg viewBox="0 0 1000 400"><g class="cv-subsystem" data-frame-id="kgs"></g>${links}${labels}${nodes}</svg></div></div>`;
  document.body.appendChild(root);
  return root;
}

function state(walkthroughId: string, stepIndex: number): StageState {
  const wt = walkthroughs.find((w) => w.id === walkthroughId)!;
  return { walkthroughId, stepIndex, step: wt.steps[stepIndex] };
}

const dimmed = (root: HTMLElement) =>
  [...root.querySelectorAll('.is-dimmed')].map((e) => e.getAttribute('data-node-id') ?? e.getAttribute('data-link-id') ?? e.getAttribute('data-frame-id') ?? `label:${e.getAttribute('data-link-label-for')}`).sort();

describe('WalkthroughStage', () => {
  it('dims what the step does not light, marks the path, badges the focus and asks the camera to frame it', () => {
    const root = drawBoard();
    const focus = vi.fn();
    root.querySelector('.player-board-stage')!.addEventListener(CAMERA_FOCUS_EVENT, (e) => focus((e as CustomEvent).detail.box));
    const stage = new WalkthroughStage(root, { reducedMotion: () => true });
    stage.show(state('wt-write', 1));
    expect(dimmed(root)).toEqual(['db', 'l-api-db', 'l-lb-api', 'label:l-api-db', 'label:l-lb-api', 'lb']);
    expect(root.querySelector('[data-frame-id="kgs"]')!.classList.contains('is-wt-focus')).toBe(true);
    expect(root.querySelector('[data-wt-badge]')!.textContent).toBe('2');
    expect(focus).toHaveBeenLastCalledWith(walkthroughs[0].steps[1].focusBox);

    stage.show(state('wt-write', 0));
    expect(root.querySelector('[data-link-id="l-api-kw"]')!.getAttribute('data-wt-flow')).toBe('path');
    expect(root.querySelector('[data-link-id="l-api-kw"] .cv-link')!.classList.contains('is-hl')).toBe(true);
    expect(root.querySelector('[data-wt-badge]')!.textContent).toBe('1');
    stage.dispose();
    root.remove();
  });

  it('two-phase revert: a step change never un-dims what both steps dim, then applies the next step', () => {
    vi.useFakeTimers();
    const root = drawBoard();
    const stage = new WalkthroughStage(root, { reducedMotion: () => false });
    stage.show(state('wt-write', 1)); // first show applies at once
    const lb = root.querySelector('[data-node-id="lb"]')!;
    const kw = root.querySelector('[data-node-id="kw"]')!;
    expect(lb.classList.contains('is-dimmed')).toBe(true);
    root.querySelector('[data-node-id="db"]')!.classList.add('other-layer');

    stage.show(state('wt-write', 2)); // lit: api, db
    // Phase 1: old decorations off, db (lit next) un-dimmed, lb (dim in both) still dim, kw (lit→dim) not yet dim.
    expect(root.querySelector('[data-wt-badge]')).toBeNull();
    expect(root.querySelector('.is-wt-focus')).toBeNull();
    expect(lb.classList.contains('is-dimmed')).toBe(true);
    expect(kw.classList.contains('is-dimmed')).toBe(false);
    expect(root.querySelector('[data-node-id="db"]')!.classList.contains('is-dimmed')).toBe(false);
    vi.runAllTimers();
    // Phase 2.
    expect(kw.classList.contains('is-dimmed')).toBe(true);
    expect(root.querySelector('[data-node-id="db"]')!.getAttribute('data-wt-tone')).toBe('info');
    expect(root.querySelector('[data-wt-marker]')!.textContent).toBe('row');

    // Leaving reverts everything this stage set, and only that.
    stage.show(null);
    expect(root.querySelectorAll('.is-dimmed, [data-wt-dim], [data-wt-tone], [data-wt-flow], .is-wt-focus').length).toBe(0);
    expect(root.querySelector('[data-node-id="db"]')!.classList.contains('other-layer')).toBe(true);
    stage.dispose();
    root.remove();
    vi.useRealTimers();
  });

  it('switching walkthroughs reverts the whole board and the camera first', () => {
    vi.useFakeTimers();
    const root = drawBoard();
    const boxes: unknown[] = [];
    root.querySelector('.player-board-stage')!.addEventListener(CAMERA_FOCUS_EVENT, (e) => boxes.push((e as CustomEvent).detail.box));
    const stage = new WalkthroughStage(root, { reducedMotion: () => false });
    stage.show(state('wt-write', 2));
    stage.show(state('looks-only', 0));
    expect(root.querySelectorAll('.is-dimmed').length).toBe(0);
    expect(boxes.at(-1)).toBeNull();
    vi.runAllTimers();
    expect(root.querySelector('[data-link-id="l-api-db"]')!.getAttribute('data-wt-fade')).toBe('');
    expect(boxes.at(-1)).toEqual(walkthroughs[1].steps[0].focusBox);
    stage.dispose();
    root.remove();
    vi.useRealTimers();
  });
});

describe('focus camera', () => {
  it('frames a box centred, never below the fit or past native size', () => {
    const fit = fitCamera(1000, 500, 2000, 500).scale; // 0.5
    const small = focusCamera(1000, 500, [300, 200, 100, 50], fit);
    expect(small.scale).toBe(1);
    expect(small.x + 300 * small.scale).toBe(500);
    expect(small.y + 200 * small.scale).toBe(250);
    const huge = focusCamera(1000, 500, [1000, 250, 2000, 500], fit);
    expect(huge.scale).toBe(fit);
  });

  it('interpolates between two cameras', () => {
    const a = { x: 0, y: 0, scale: 1 };
    const b = { x: 100, y: 50, scale: 4 };
    expect(interpolateCamera(a, b, 0)).toBe(a);
    expect(interpolateCamera(a, b, 1)).toBe(b);
    expect(interpolateCamera(a, b, 0.5)).toEqual({ x: 50, y: 25, scale: 2 });
  });
});
