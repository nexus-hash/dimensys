import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Board } from '../Board';
import { Node } from '../Node';

function collectIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
}

describe('Board', () => {
  it('renders its defs and namespaces ids by boardId', () => {
    const { container } = render(
      <Board id="board-a">
        <Node boardId="board-a" id="n1" type="server" label="API" />
      </Board>,
    );
    const ids = collectIds(container);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith('board-a'))).toBe(true);
  });

  it('produces no duplicate SVG ids when two boards are on the same page', () => {
    const { container } = render(
      <div>
        <Board id="board-1">
          <Node boardId="board-1" id="n1" type="server" label="API" health="down" />
        </Board>
        <Board id="board-2">
          <Node boardId="board-2" id="n1" type="db" label="Primary DB" health="critical" />
        </Board>
      </div>,
    );
    const ids = collectIds(container);
    const unique = new Set(ids);
    expect(ids.length).toBeGreaterThan(0);
    expect(unique.size).toBe(ids.length);
  });
});
