import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StaticBlueprint } from '../StaticBlueprint';
import type { Board } from '../../types';

describe('StaticBlueprint', () => {
  it('renders the board svg with the given viewBox and label, no client JS required', () => {
    const board: Board = { size: [640, 320], blocks: [], wires: [] };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" label="Test diagram" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 640 320');
    expect(svg).toHaveAttribute('aria-label', 'Test diagram');
  });

  it('draws nodes at their box center', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [{ id: 'api', form: 'server', flavor: 'go', text: 'API Service', box: [100, 80, 144, 72] }],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const g = container.querySelector('[data-node-id="api"]');
    expect(g).toBeTruthy();
    expect(g?.getAttribute('transform')).toBe('translate(28, 44)'); // (100 - 72, 80 - 36)
    expect(g?.querySelector('.cv-label')?.textContent).toBe('API Service');
    expect(g?.querySelector('.cv-sub')?.textContent).toBe('go') // a server's variant is its kind: `<kind> · <detail>[ ×N]`;
  });

  it('appends a replica count to the sub-label once stack > 1', () => {
    const board: Board = {
      size: [400, 200],
      // Short enough that this fits without truncation kicking in (that's covered separately below).
      blocks: [{ id: 'api', form: 'server', flavor: 'x', text: 'API', box: [100, 80, 144, 72], stack: 4 }],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-node-id="api"] .cv-sub')?.textContent).toBe('x · ×4');
  });

  describe('meter row baseline (FID: every simulated node gets one, server-rendered at baseline)', () => {
    it.each([
      ['server', 'util'],
      ['cache', 'hit'],
      ['queue', 'backlog'],
      ['messageBus', 'backlog'],
      ['db', 'util'],
    ] as const)('a %s node gets a %s meter at value 0', (form, kind) => {
      const board: Board = {
        size: [400, 200],
        blocks: [{ id: 'n', form, text: 'Node', box: [100, 80, 144, 72] }],
        wires: [],
      };
      const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
      const g = container.querySelector('[data-node-id="n"]');
      expect(g?.getAttribute('data-meter-kind')).toBe(kind);
      expect(g?.querySelector('.cv-mtrack')).toBeTruthy();
      expect(g?.querySelector('.cv-mfill')?.getAttribute('width')).toBe('0');
    });

    it('a client (traffic source) node gets no meter row at all', () => {
      const board: Board = {
        size: [400, 200],
        blocks: [{ id: 'n', form: 'client', text: 'Browser', box: [100, 80, 144, 72] }],
        wires: [],
      };
      const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
      const g = container.querySelector('[data-node-id="n"]');
      expect(g?.hasAttribute('data-meter-kind')).toBe(false);
      expect(g?.querySelector('.cv-mtrack')).toBeNull();
    });
  });

  it('skips a spare node with no box yet', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [{ id: 'future', form: 'server', text: 'Future node' }],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-node-id="future"]')).toBeNull();
  });

  it('skips a node whose form the HLD renderer does not know (e.g. a DSA/LLD member)', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [{ id: 'cell0', form: 'cell', text: '7', box: [50, 50, 48, 48] }],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-node-id="cell0"]')).toBeNull();
  });

  it('draws a link along its route, with a label at the arc-length midpoint', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [],
      wires: [{ id: 'l1', a: 'a', b: 'b', line: 'async', text: 'write path', route: [[0, 0], [100, 0]] }],
    };
    const { container, getByText } = render(<StaticBlueprint board={board} boardId="b1" />);
    const g = container.querySelector('[data-link-id="l1"]');
    expect(g).toBeTruthy();
    expect(g?.querySelector('.cv-link')?.getAttribute('class')).toContain('is-async');
    expect(g?.querySelector('.cv-link')).toHaveAttribute('d', 'M0,0 L100,0');
    expect(getByText('write path')).toBeTruthy();
    // The target node id travels onto the DOM (`data-to`): the interactive layer (T3.3)
    // reads it to find a link's speed from its *target node's* own latency (a link has none).
    expect(g).toHaveAttribute('data-to', 'b');
  });

  it("uses the link's collision-free `cap` anchor for the label, not the arc-length midpoint, when present", () => {
    const board: Board = {
      size: [400, 200],
      blocks: [],
      wires: [
        {
          id: 'l1',
          a: 'a',
          b: 'b',
          line: 'sync',
          text: 'Write/Read DB',
          route: [[0, 0], [50, 0], [50, 100], [100, 100]],
          cap: { pt: [50, 40], axis: 'v', sz: [113.4, 20] },
        },
      ],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const label = container.querySelector('.cv-link-label[data-link-label-for="l1"]');
    expect(label).toHaveAttribute('transform', 'translate(50, 40)');
  });

  it("falls back to the arc-length midpoint when `cap` is absent (an older/unsynced document)", () => {
    const board: Board = {
      size: [400, 200],
      blocks: [],
      wires: [{ id: 'l1', a: 'a', b: 'b', line: 'sync', text: 'no cap here', route: [[0, 0], [100, 0]] }],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const label = container.querySelector('.cv-link-label[data-link-label-for="l1"]');
    expect(label).toHaveAttribute('transform', 'translate(50, 0)');
  });

  it('draws a curved route (`curve`) as cubic Bézier segments through every third point', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [],
      wires: [{ id: 'l1', a: 'a', b: 'b', line: 'sync', curve: true, route: [[0, 0], [50, 0], [50, 100], [100, 100]] }],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-link-id="l1"] .cv-link')).toHaveAttribute('d', 'M0,0 C50,0 50,100 100,100');
  });

  it('draws every label pill after every link of its level, outside the link group, so no line crosses a pill', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [],
      wires: [
        { id: 'l1', a: 'a', b: 'b', line: 'sync', text: 'first', route: [[0, 0], [100, 0]], cap: { pt: [50, 0], axis: 'h', sz: [80, 20] } },
        { id: 'l2', a: 'a', b: 'c', line: 'sync', route: [[50, -50], [50, 50]] },
      ],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const pill = container.querySelector('.cv-link-label[data-link-label-for="l1"]')!;
    expect(pill.closest('[data-link-id]')).toBeNull();
    const l2 = container.querySelector('[data-link-id="l2"]')!;
    // `l2` crosses the pill's spot; the pill comes later in document (paint) order.
    expect(l2.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('skips a spare link with no route yet', () => {
    const board: Board = { size: [400, 200], blocks: [], wires: [{ id: 'future', a: 'a', b: 'b', line: 'sync' }] };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-link-id="future"]')).toBeNull();
  });

  it('draws a frame round a group, behind its nodes, with no card or control of its own', () => {
    const board: Board = {
      size: [600, 300],
      blocks: [
        { id: 'inner-a', form: 'worker', text: 'A', box: [200, 150, 100, 50] },
        { id: 'inner-b', form: 'db', text: 'B', box: [400, 150, 100, 50] },
      ],
      wires: [{ id: 'inner-link', a: 'inner-a', b: 'inner-b', line: 'sync', route: [[250, 150], [350, 150]] }],
      frames: [{ id: 'sub1', text: 'Key Service', look: 'cluster', box: [300, 150, 328, 78], holds: ['inner-a', 'inner-b'] }],
    };
    const { container, getByText } = render(<StaticBlueprint board={board} boardId="b1" />);
    // The tab shows the group's own label, uppercased by the canvas kit (no node count, no expand glyph).
    expect(getByText('KEY SERVICE')).toBeTruthy();
    const frame = container.querySelector('[data-frame-id="sub1"]')!;
    expect(frame.getAttribute('transform')).toBe('translate(136, 111)');
    expect(frame.querySelector('.cv-body')).toHaveAttribute('width', '328');
    // Drawn first: every node and link comes after it, so it sits behind them.
    const svg = container.querySelector('svg')!;
    const order = [...svg.querySelectorAll('[data-frame-id], [data-node-id], [data-link-id]')];
    expect(order[0]).toBe(frame);
    // Its children are ordinary nodes at the board's own coordinates.
    expect(container.querySelector('[data-node-id="inner-a"]')?.getAttribute('transform')).toBe('translate(150, 125)');
    expect(container.querySelector('[data-node-id="sub1"]')).toBeNull();
  });

  it('defaults every element to ok health with no lookup (the healthy baseline)', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [{ id: 'api', form: 'server', text: 'API', box: [100, 80, 144, 72] }],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const g = container.querySelector('[data-node-id="api"]');
    expect(g?.getAttribute('class')).not.toMatch(/cv-health-/);
  });

  it('drives a node ring from the health lookup when mode is health (the default)', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [{ id: 'api', form: 'server', text: 'API', box: [100, 80, 144, 72] }],
      wires: [],
    };
    const { container } = render(
      <StaticBlueprint board={board} boardId="b1" health={{ api: { state: 'critical', label: 'err 38%' } }} />,
    );
    const g = container.querySelector('[data-node-id="api"]');
    expect(g?.getAttribute('class')).toContain('cv-health-critical');
    expect(g?.getAttribute('aria-label')).toContain('critical');
  });
});
