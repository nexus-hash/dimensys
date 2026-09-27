import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DrilldownBlueprint } from '../DrilldownBlueprint';
import { PlayerStoreProvider } from '../../store/PlayerStoreProvider';
import type { Board } from '../../types';

const boot = { diagramId: 'url-shortener', revision: 1, hash: 'sha256:abc', diagramUrl: '/solutions/url-shortener/diagram.json', hasSimulation: false, runtimeUrl: null, simUrl: null, canvas: { w: 0, h: 0 } };

const board: Board = {
  size: [1248, 492],
  blocks: [
    { id: 'client-web', form: 'client', text: 'Web', box: [50, 50, 100, 60] },
    {
      id: 'kgs-service',
      form: 'subSystem',
      text: 'Key Generation Service',
      folded: false,
      box: [888, 180, 192, 96],
      inner: {
        size: [408, 72],
        blocks: [
          { id: 'kgs-worker', form: 'worker', text: 'KGS Worker', box: [72, 36, 144, 72] },
          { id: 'kgs-db', form: 'db', text: 'Key Pool (SQL)', box: [336, 36, 144, 72] },
        ],
        wires: [],
      },
    },
  ],
  wires: [],
};

function renderIt(ui: React.ReactElement) {
  return render(<PlayerStoreProvider bootstrap={boot}>{ui}</PlayerStoreProvider>);
}

describe('DrilldownBlueprint', () => {
  it('pre-renders the root level visible and every subsystem level hidden', () => {
    const { container } = renderIt(<DrilldownBlueprint board={board} boardId="b1" rootLabel="URL shortener" />);
    const root = container.querySelector('[data-drill-key=""]');
    const kgs = container.querySelector('[data-drill-key="kgs-service"]');
    expect(root).not.toHaveAttribute('hidden');
    expect(kgs).toHaveAttribute('hidden');
  });

  it('reuses StaticBlueprint for the subsystem level — its inner nodes are in the markup, just hidden', () => {
    const { container } = renderIt(<DrilldownBlueprint board={board} boardId="b1" rootLabel="URL shortener" />);
    const kgsLevel = container.querySelector('[data-drill-key="kgs-service"]');
    expect(kgsLevel?.querySelector('[data-node-id="kgs-worker"]')).toBeTruthy();
    expect(kgsLevel?.querySelector('[data-node-id="kgs-db"]')).toBeTruthy();
    // Its own board, its own camera — the child SVG has its own viewBox sized to the inner board.
    const svg = kgsLevel?.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 408 72');
  });

  it('renders the collapsed affordance for the subsystem in the root level (drill entry point)', () => {
    const { container } = renderIt(<DrilldownBlueprint board={board} boardId="b1" rootLabel="URL shortener" />);
    const root = container.querySelector('[data-drill-key=""]');
    // folded: false means the T3.2 default inline-expanded frame renders here, whose tab is the other entry point.
    expect(root?.querySelector('[data-subsystem-tab-id="kgs-service"]')).toBeTruthy();
  });

  it('renders a plain single level with no breadcrumb affordance needed when there are no subsystems', () => {
    const flat: Board = { size: [400, 200], blocks: [{ id: 'a', form: 'server', text: 'A', box: [50, 50, 100, 60] }], wires: [] };
    const { container } = renderIt(<DrilldownBlueprint board={flat} boardId="b1" rootLabel="Flat" />);
    expect(container.querySelectorAll('[data-drill-key]')).toHaveLength(1);
  });
});
