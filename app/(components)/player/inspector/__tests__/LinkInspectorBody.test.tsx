import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LinkInspectorBody } from '../LinkInspectorBody';
import { buildElementIndex } from '../../shell/selection';
import type { Board } from '../../types';

const board: Board = {
  size: [400, 200],
  blocks: [
    { id: 'api', form: 'server', text: 'API' },
    { id: 'db', form: 'db', text: 'Database' },
  ],
  wires: [
    { id: 'l1', a: 'api', b: 'db', line: 'sync' },
    { id: 'l2', a: 'api', b: 'db', line: 'async', text: 'events', rel: 'publishes' },
  ],
};

describe('LinkInspectorBody', () => {
  const index = buildElementIndex(board);

  it('shows the endpoints (resolved to node labels) and the protocol/kind for a link with no label', () => {
    render(<LinkInspectorBody link={board.wires[0]} index={index} />);
    expect(screen.getByText('API')).toBeTruthy();
    expect(screen.getByText('Database')).toBeTruthy();
    expect(screen.getByText('sync')).toBeTruthy();
    expect(screen.queryByText('Label')).toBeNull();
  });

  it('also shows the label and relation glyph when the link carries them', () => {
    render(<LinkInspectorBody link={board.wires[1]} index={index} />);
    expect(screen.getByText('events')).toBeTruthy();
    expect(screen.getByText('publishes')).toBeTruthy();
  });

  it('falls back to the raw endpoint id if it is not in the index', () => {
    const orphan = { id: 'l3', a: 'ghost', b: 'db', line: 'sync' };
    render(<LinkInspectorBody link={orphan} index={index} />);
    expect(screen.getByText('ghost')).toBeTruthy();
  });
});
