import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StaticBlueprint } from '../StaticBlueprint';
import { applyShape, captureShape, drawnBox } from '../shape';
import { tallShape } from '../tallShape';
import { readingFitCamera, readingFitScale, fitCamera } from '../camera';
import type { Board } from '../../types';

const board: Board = {
  size: [600, 200],
  blocks: [
    { id: 'a', form: 'server', text: 'A', box: [100, 100, 144, 72] },
    { id: 'b', form: 'db', text: 'B', box: [300, 100, 144, 72] },
    { id: 'c', form: 'cache', text: 'C', box: [500, 100, 144, 72] },
  ],
  wires: [
    { id: 'ab', a: 'a', b: 'b', line: 'sync', text: 'reads', route: [[172, 100], [228, 100]], cap: { pt: [200, 100], axis: 'h', sz: [60, 20] } },
    { id: 'bc', a: 'b', b: 'c', line: 'sync', route: [[372, 100], [428, 100]] },
  ],
  frames: [{ id: 'g', text: 'Storage group', look: 'group', box: [400, 100, 360, 120], holds: ['b', 'c'] }],
  tall: {
    size: [200, 520],
    boxes: { a: [100, 60, 144, 72], b: [100, 260, 144, 72], c: [100, 440, 144, 72] },
    wires: {
      ab: { route: [[100, 96], [100, 150], [100, 170], [100, 224]], curve: true, cap: { pt: [100, 160], axis: 'v', sz: [60, 20] } },
      bc: { route: [[100, 296], [100, 404]] },
    },
    frames: { g: [100, 350, 180, 300] },
  },
};

function drawn() {
  const { container } = render(<StaticBlueprint board={board} boardId="t" label="Test" />);
  return container.querySelector('svg')!;
}

describe('the tall arrangement', () => {
  it('is precomputed on the server as path data, pill boxes and frame tabs', () => {
    const shape = tallShape(board)!;
    expect(shape.size).toEqual([200, 520]);
    expect(shape.nodes.a).toEqual([28, 24]);
    expect(shape.links.ab.d).toBe('M100,96 C100,150 100,170 100,224');
    expect(shape.links.ab.pill).toEqual([100, 160, 60, 20]);
    expect(shape.links.bc.pill).toBeUndefined();
    expect(shape.frames.g).toMatchObject({ x: 10, y: 200, w: 180, h: 300 });
    expect(shape.frames.g.tab.length).toBeGreaterThan(0);
    expect(tallShape({ ...board, tall: undefined })).toBeNull();
  });

  it('is written onto the drawn board in place, and the wide one read back and restored', () => {
    const svg = drawn();
    const tall = tallShape(board)!;
    const wide = captureShape(svg, tall);
    expect(wide.size).toEqual([600, 200]);
    expect(wide.nodes.b).toEqual([228, 64]);

    applyShape(svg, null, tall);
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 520');
    expect(svg.querySelector('[data-node-id="c"]')!.getAttribute('transform')).toBe('translate(28, 404)');
    expect(svg.querySelector('[data-link-id="ab"] path.cv-link')!.getAttribute('d')).toBe(tall.links.ab.d);
    expect(svg.querySelector('[data-link-id="ab"] path.cv-link-hit')!.getAttribute('d')).toBe(tall.links.ab.d);
    expect(svg.querySelector('[data-link-label-for="ab"]')!.getAttribute('transform')).toBe('translate(100, 160)');
    expect(svg.querySelector('[data-frame-id="g"] > rect.cv-body')!.getAttribute('width')).toBe('180');
    expect(drawnBox(svg, 'b')).toEqual([100, 260, 144, 72]);
    expect(drawnBox(svg, 'g')).toEqual([100, 350, 180, 300]);

    applyShape(svg, null, wide);
    expect(svg.getAttribute('viewBox')).toBe('0 0 600 200');
    expect(drawnBox(svg, 'b')).toEqual([300, 100, 144, 72]);
    expect(svg.querySelector('[data-link-id="bc"] path.cv-link')!.getAttribute('d')).toBe('M372,100 L428,100');
  });

  it('keeps other layers\' state on the elements it moves', () => {
    const svg = drawn();
    const node = svg.querySelector('[data-node-id="a"]')!;
    node.classList.add('cv-health-down');
    applyShape(svg, null, tallShape(board)!);
    expect(svg.querySelector('[data-node-id="a"]')).toBe(node);
    expect(node.classList.contains('cv-health-down')).toBe(true);
  });
});

describe('readingFitCamera', () => {
  it('fits a tall board to the width and shows it from the top', () => {
    expect(readingFitCamera(360, 500, 400, 1000)).toEqual({ scale: 0.9, x: 0, y: 0 });
    expect(readingFitScale(360, 500, 400, 1000)).toBe(0.9);
  });

  it('never upscales past 1x', () => {
    expect(readingFitCamera(800, 500, 400, 1000).scale).toBe(1);
  });

  it('is the plain fit when the board nearly fits both ways', () => {
    expect(readingFitCamera(400, 980, 400, 1000)).toEqual(fitCamera(400, 980, 400, 1000));
  });
});
