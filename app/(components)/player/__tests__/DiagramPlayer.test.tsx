import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramPlayer, diagramJsonUrl } from '../DiagramPlayer';
import type { PlayerDiagram } from '../types';

const diagram: PlayerDiagram = {
  id: 'url-shortener',
  compiled: { engineVersion: '3.0.0', hash: `sha256:${'ab'.repeat(32)}`, builtAt: '2026-09-26T00:00:00.000Z' },
  layouts: { desktop: { canvas: { w: 800, h: 400 }, nodes: {}, links: {} } },
  metadata: { title: 'URL shortener' },
  walkthroughStates: {},
  hasSimulation: true,
};

describe('DiagramPlayer (skeleton)', () => {
  it('renders the not-implemented notice inside the client island', () => {
    const { container } = render(<DiagramPlayer diagram={diagram} />);
    expect(screen.getByRole('status')).toHaveTextContent('Player not implemented yet');
    const root = container.querySelector('[data-player-root="url-shortener"]');
    expect(root).toHaveAttribute('data-player-mode', 'explore');
    // No runtime bundle passed: the static frame is the whole player.
    expect(root).toHaveAttribute('data-sim-status', 'unavailable');
  });

  it('renders a safe notice for a missing diagram', () => {
    render(<DiagramPlayer diagram={null} />);
    expect(screen.getByRole('status')).toHaveTextContent("This diagram isn't available.");
  });

  it('builds a hash-busted JSON URL', () => {
    expect(diagramJsonUrl(diagram)).toBe('/solutions/url-shortener/diagram.json?h=abababababababab');
  });
});
