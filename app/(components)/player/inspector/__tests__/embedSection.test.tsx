import { describe, it, expect, vi } from 'vitest';
import { render, screen } from './test-utils';
import type { Board, EmbedPart } from '../../types';

vi.mock('../embedTarget', () => ({
  loadEmbedTarget: vi.fn(async (id: string) =>
    id === 'url-shortener'
      ? { id, title: 'URL Shortener', blurb: 'b', ready: true, board: BOARD }
      : { id, title: id === 'lru-cache' ? 'LRU Cache' : null, blurb: null, ready: false },
  ),
}));

import { EmbedCard, EmbedSection } from '../EmbedSection';
import { MiniBoard } from '../MiniBoard';

const BOARD: Board = {
  size: [400, 200],
  blocks: [
    { id: 'a', form: 'server', text: 'A', box: [50, 50, 60, 40] },
    { id: 'b', form: 'db', text: 'B', box: [300, 150, 60, 40] },
    { id: 'spare', form: 'db', text: 'S' },
  ],
  wires: [
    { id: 'l1', a: 'a', b: 'b', line: 'sync', route: [[80, 50], [300, 50], [300, 130]] },
    { id: 'l2', a: 'a', b: 'b', line: 'sync', route: [[50, 70], [50, 100], [100, 150], [270, 150]], curve: true },
  ],
  frames: [{ id: 'f', text: 'Zone', look: 'zone', box: [200, 100, 380, 180], holds: ['a', 'b'] }],
};

const PART: EmbedPart = { shape: 'embed', pane: 'architecture', title: 'Short share links', diagram: 'url-shortener', note: 'How redirects scale.' };

describe('MiniBoard', () => {
  it('draws frames, routed links and laid-out nodes only, hidden from assistive tech', () => {
    const { container } = render(<MiniBoard board={BOARD} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 400 200');
    expect(svg.querySelectorAll('rect')).toHaveLength(3); // frame + two boxed nodes
    const paths = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'));
    expect(paths).toEqual(['M80 50L300 50L300 130', 'M50 70C50 100 100 150 270 150']);
    expect(container.textContent).toBe('');
  });
});

describe('EmbedCard', () => {
  it('a ready target: title, note, preview and an Open link to its page', () => {
    render(<EmbedCard part={PART} target={{ id: 'url-shortener', title: 'URL Shortener', blurb: null, ready: true, board: BOARD }} />);
    expect(screen.getByText('Short share links')).toBeTruthy();
    expect(screen.getByText('URL Shortener')).toBeTruthy();
    expect(screen.getByText('How redirects scale.')).toBeTruthy();
    expect(document.querySelector('[data-mini-board]')).not.toBeNull();
    const link = screen.getByRole('link', { name: 'Open URL Shortener' });
    expect(link).toHaveAttribute('href', '/solutions/url-shortener');
    expect(screen.queryByText('Coming soon')).toBeNull();
  });

  it('a target that is not ready: a disabled card marked Coming soon, no link', () => {
    render(<EmbedCard part={{ ...PART, diagram: 'lru-cache' }} target={{ id: 'lru-cache', title: 'LRU Cache', blurb: null, ready: false }} />);
    expect(screen.getByText('LRU Cache')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled();
    expect(document.querySelector('[data-mini-board]')).toBeNull();
  });

  it('an unknown target falls back to its id as the name', () => {
    render(<EmbedCard part={{ ...PART, diagram: 'nope' }} target={{ id: 'nope', title: null, blurb: null, ready: false }} />);
    expect(screen.getByText('nope')).toBeTruthy();
  });
});

describe('EmbedSection', () => {
  it('resolves its target from the catalog at render time', async () => {
    render(await EmbedSection({ part: PART }));
    expect(screen.getByRole('link', { name: 'Open URL Shortener' })).toHaveAttribute('href', '/solutions/url-shortener');
  });

  it('a planned target renders the Coming soon card', async () => {
    render(await EmbedSection({ part: { ...PART, diagram: 'lru-cache' } }));
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
});
