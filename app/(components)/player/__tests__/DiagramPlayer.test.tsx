import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramPlayer, diagramJsonUrl } from '../DiagramPlayer';
import type { ViewData } from '../types';

const diagram: ViewData = {
  fmt: 2,
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

describe('DiagramPlayer', () => {
  it('renders the static blueprint inside the client island', () => {
    const { container } = render(<DiagramPlayer diagram={diagram} />);
    const svg = container.querySelector('svg[aria-label="URL shortener"]');
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('viewBox', '0 0 800 400');
    const root = container.querySelector('[data-player-root="url-shortener"]');
    expect(root).toHaveAttribute('data-player-mode', 'explore');
    // No runtime bundle passed: the static frame is the whole player.
    expect(root).toHaveAttribute('data-sim-status', 'unavailable');
  });

  it('renders nodes and links from the diagram board', () => {
    const withBoard: ViewData = {
      ...diagram,
      board: {
        size: [400, 200],
        blocks: [
          { id: 'a', form: 'client', text: 'Client', box: [72, 100, 144, 72] },
          { id: 'b', form: 'server', text: 'API', box: [300, 100, 144, 72] },
        ],
        wires: [{ id: 'l1', a: 'a', b: 'b', line: 'sync', route: [[144, 100], [300, 100]] }],
      },
    };
    const { container } = render(<DiagramPlayer diagram={withBoard} />);
    expect(container.querySelector('[data-node-id="a"]')).toBeTruthy();
    expect(container.querySelector('[data-node-id="b"]')).toBeTruthy();
    expect(container.querySelector('[data-link-id="l1"]')).toBeTruthy();
  });

  it('shows a placeholder for a diagram with no board yet', () => {
    const noBoard: ViewData = { ...diagram, board: undefined };
    render(<DiagramPlayer diagram={noBoard} />);
    expect(screen.getByRole('status')).toHaveTextContent('No diagram yet');
  });

  it('renders a safe notice for a missing diagram', () => {
    render(<DiagramPlayer diagram={null} />);
    expect(screen.getByRole('status')).toHaveTextContent("This diagram isn't available.");
  });

  it('builds a hash-busted JSON URL', () => {
    expect(diagramJsonUrl(diagram)).toBe('/solutions/url-shortener/diagram.json?h=abababababababab');
  });
});
