import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramPlayer, diagramJsonUrl } from '../DiagramPlayer';
import type { ViewData } from '../types';

const diagram: ViewData = {
  fmt: 1,
  build: `sha256:${'ab'.repeat(32)}`,
  id: 'url-shortener',
  rev: 1,
  family: 'hld',
  head: { title: 'URL shortener', blurb: 'A shortener service.', grade: 'medium', labels: [] },
  needs: [],
  premises: [],
  refs: [],
  board: { size: [800, 400], blocks: [], wires: [] },
  spares: { blocks: [], wires: [] },
  pins: [],
  stories: [],
  plays: [],
  remedies: [],
  switches: [],
  gauges: [],
  calcs: [],
  drills: [],
  motifs: [],
  live: true,
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
