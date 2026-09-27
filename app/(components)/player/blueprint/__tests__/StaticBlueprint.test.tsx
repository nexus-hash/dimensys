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
    expect(g?.querySelector('.cv-sub')?.textContent).toBe('server · go');
  });

  it('appends a replica count to the sub-label once stack > 1', () => {
    const board: Board = {
      size: [400, 200],
      // Short enough that this fits without truncation kicking in (that's covered separately below).
      blocks: [{ id: 'api', form: 'server', flavor: 'x', text: 'API', box: [100, 80, 144, 72], stack: 4 }],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-node-id="api"] .cv-sub')?.textContent).toBe('server · x ×4');
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
    const label = container.querySelector('[data-link-id="l1"] .cv-link-label');
    expect(label).toHaveAttribute('transform', 'translate(50, 40)');
  });

  it("falls back to the arc-length midpoint when `cap` is absent (an older/unsynced document)", () => {
    const board: Board = {
      size: [400, 200],
      blocks: [],
      wires: [{ id: 'l1', a: 'a', b: 'b', line: 'sync', text: 'no cap here', route: [[0, 0], [100, 0]] }],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const label = container.querySelector('[data-link-id="l1"] .cv-link-label');
    expect(label).toHaveAttribute('transform', 'translate(50, 0)');
  });

  it('skips a spare link with no route yet', () => {
    const board: Board = { size: [400, 200], blocks: [], wires: [{ id: 'future', a: 'a', b: 'b', line: 'sync' }] };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    expect(container.querySelector('[data-link-id="future"]')).toBeNull();
  });

  it('renders a folded subsystem as the collapsed affordance with its inner node count', () => {
    const board: Board = {
      size: [400, 200],
      blocks: [
        {
          id: 'sub1',
          form: 'subSystem',
          text: 'Key Service',
          box: [200, 100, 192, 96],
          folded: true,
          inner: { size: [300, 72], blocks: [{ id: 'w1', form: 'worker', text: 'W' }, { id: 'w2', form: 'worker', text: 'W2' }], wires: [] },
        },
      ],
      wires: [],
    };
    const { container } = render(<StaticBlueprint board={board} boardId="b1" />);
    const g = container.querySelector('[data-node-id="sub1"]');
    expect(g?.getAttribute('aria-label')).toContain('2 nodes');
    // The inner content is not drawn while folded.
    expect(container.querySelector('[data-node-id="w1"]')).toBeNull();
  });

  it('renders an expanded subsystem as a frame with its inner nodes/links positioned in the parent space', () => {
    const board: Board = {
      size: [600, 300],
      blocks: [
        {
          id: 'sub1',
          form: 'subSystem',
          text: 'Key Service',
          box: [300, 150, 192, 96],
          folded: false,
          inner: {
            size: [200, 100],
            blocks: [
              { id: 'inner-a', form: 'worker', text: 'A', box: [50, 50, 100, 50] },
              { id: 'inner-b', form: 'db', text: 'B', box: [150, 50, 100, 50] },
            ],
            wires: [{ id: 'inner-link', a: 'inner-a', b: 'inner-b', line: 'sync', route: [[100, 50], [150, 50]] }],
          },
        },
      ],
      wires: [],
    };
    const { container, getByText } = render(<StaticBlueprint board={board} boardId="b1" />);
    // Frame tab shows the subsystem's own label and node count, uppercased by the canvas kit.
    expect(getByText('KEY SERVICE · 2 NODES')).toBeTruthy();
    // Inner nodes are positioned relative to the frame's top-left, which is centered on the subsystem's box.
    // Frame top-left = (300 - 200/2, 150 - 100/2) = (200, 100). inner-a center (50,50) -> absolute (250, 150).
    const innerA = container.querySelector('[data-node-id="inner-a"]');
    expect(innerA?.getAttribute('transform')).toBe('translate(178, 114)'); // (250 - 72, 150 - 36)
    expect(container.querySelector('[data-link-id="inner-link"]')).toBeTruthy();
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
