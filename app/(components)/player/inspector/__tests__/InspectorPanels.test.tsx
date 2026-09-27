import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildInspectorPanels } from '../InspectorPanels';
import { buildElementIndex } from '../../shell/selection';
import type { Board } from '../../types';

const board: Board = {
  size: [400, 200],
  blocks: [
    {
      id: 'api',
      form: 'server',
      text: 'API',
      sheet: { parts: [{ shape: 'pairs', pane: 'overview', title: 'Specs', pairs: [['Region', 'us-east-1']] }] },
    },
    { id: 'plain', form: 'client', text: 'No sheet here' },
    {
      id: 'sub',
      form: 'subSystem',
      text: 'Subsystem',
      inner: {
        size: [100, 100],
        blocks: [{ id: 'inner-a', form: 'db', text: 'Inner DB', sheet: { parts: [{ shape: 'prose', pane: 'overview', title: 'Note', md: 'hi' }] } }],
        wires: [],
      },
    },
  ],
  wires: [{ id: 'l1', a: 'api', b: 'plain', line: 'sync' }],
};

describe('buildInspectorPanels', () => {
  const index = buildElementIndex(board);
  const panels = buildInspectorPanels(board, index);

  it('builds one panel per top-level node', () => {
    render(<>{panels.api}</>);
    expect(screen.getByText('Specs')).toBeTruthy();
    expect(screen.getByText('us-east-1')).toBeTruthy();
  });

  it('builds a panel for every link', () => {
    render(<>{panels.l1}</>);
    // API -> No sheet here (endpoints resolved to labels).
    expect(screen.getByText('API')).toBeTruthy();
    expect(screen.getByText('No sheet here')).toBeTruthy();
  });

  it('walks into nested subsystem boards too', () => {
    expect(panels['inner-a']).toBeTruthy();
  });

  it('gives a node with no sheet a panel too (the "no details" fallback)', () => {
    render(<>{panels.plain}</>);
    expect(screen.getByRole('status')).toHaveTextContent('No additional details');
  });
});
