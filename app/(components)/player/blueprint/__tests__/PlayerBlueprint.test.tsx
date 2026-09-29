import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { PlayerBlueprint } from '../PlayerBlueprint';
import { PlayerStoreProvider } from '../../store/PlayerStoreProvider';
import type { Board } from '../../types';

const boot = { diagramId: 'url-shortener', revision: 1, hash: 'sha256:abc', diagramUrl: '/solutions/url-shortener/diagram.json', hasSimulation: false, runtimeUrl: null, simUrl: null, canvas: { w: 0, h: 0 } };

/** A flat board with one framed group: its children are ordinary blocks, the link to the group ends on its entry child. */
const board: Board = {
  size: [800, 240],
  blocks: [
    { id: 'client-web', form: 'client', text: 'Web', box: [72, 120, 144, 72] },
    { id: 'kgs-worker', form: 'worker', text: 'KGS Worker', box: [370, 134, 144, 72] },
    { id: 'kgs-db', form: 'db', text: 'Key Pool (SQL)', box: [570, 134, 144, 72] },
  ],
  wires: [
    { id: 'l-client-kgs', a: 'client-web', b: 'kgs-worker', line: 'sync', route: [[144, 120], [200, 120], [242, 134], [296, 134]], curve: true },
    { id: 'kgs-link', a: 'kgs-worker', b: 'kgs-db', line: 'sync', route: [[442, 134], [470, 134], [470, 134], [496, 134]], curve: true },
  ],
  frames: [{ id: 'kgs-service', text: 'Key Generation Service', look: 'cluster', box: [470, 134, 372, 100], holds: ['kgs-worker', 'kgs-db'] }],
};

function renderIt(ui: React.ReactElement) {
  return render(<PlayerStoreProvider bootstrap={boot}>{ui}</PlayerStoreProvider>);
}

describe('PlayerBlueprint', () => {
  it('renders one board: every node inline, including the framed group’s children', () => {
    const { container } = renderIt(<PlayerBlueprint board={board} boardId="b1" title="URL shortener" />);
    expect(container.querySelectorAll('[data-board-level]')).toHaveLength(1);
    expect(container.querySelectorAll('svg[aria-label]')).toHaveLength(1);
    for (const id of ['client-web', 'kgs-worker', 'kgs-db']) expect(container.querySelector(`[data-node-id="${id}"]`)).toBeTruthy();
    expect(container.querySelector('svg[aria-label]')).toHaveAttribute('viewBox', '0 0 800 240');
  });

  it('draws the group as a frame whose only control is its tab, ahead of its children in focus order', () => {
    const { container } = renderIt(<PlayerBlueprint board={board} boardId="b1" title="URL shortener" />);
    const frame = container.querySelector('[data-frame-id="kgs-service"]')!;
    expect(frame.querySelector('.cv-tab')).toHaveTextContent('KEY GENERATION SERVICE');
    expect(frame.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(container.querySelector('[data-node-id="kgs-service"]')).toBeNull();
    const focusable = [...container.querySelectorAll('svg [tabindex="0"]')];
    const tabAt = focusable.findIndex((el) => el.getAttribute('data-frame-tab') === 'kgs-service');
    const childAt = focusable.findIndex((el) => el.getAttribute('data-node-id') === 'kgs-worker');
    expect(tabAt).toBeGreaterThanOrEqual(0);
    expect(tabAt).toBeLessThan(childAt);
  });

  it('has no drill or expand control anywhere, and clicking a framed child keeps the one board', async () => {
    const user = userEvent.setup();
    const { container } = renderIt(<PlayerBlueprint board={board} boardId="b1" title="URL shortener" />);
    expect(container.querySelector('[data-subsystem-tab-id], [data-child-ids], .cv-expand, .cv-subsystem-card, [data-drill-key]')).toBeNull();
    await user.click(container.querySelector('[data-node-id="kgs-worker"]')!);
    expect(container.querySelectorAll('[data-board-level]')).toHaveLength(1);
    expect(container.querySelector('[data-board-level]')).not.toHaveAttribute('hidden');
  });

  it('interactive: zoom controls on the stage (no chrome strip here)', () => {
    const { getByLabelText } = renderIt(<PlayerBlueprint board={board} boardId="b1" title="URL shortener" />);
    expect(getByLabelText('Zoom in')).toBeTruthy();
    expect(getByLabelText('Fit to view')).toBeTruthy();
  });

  it('interactive={false}: no zoom controls, nothing focusable, a static stage', () => {
    const { container } = renderIt(<PlayerBlueprint board={board} boardId="b1" title="URL shortener" interactive={false} />);
    expect(container.querySelector('.player-zoom-controls')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('.player-board-stage')).toHaveClass('is-static');
    expect(container.querySelectorAll('svg [tabindex="0"]')).toHaveLength(0);
    expect(container.querySelector('[data-node-id="client-web"]')).toHaveAttribute('role', 'img');
  });
});
