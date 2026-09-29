/**
 * Server side of the board's tall arrangement (`shape.ts`): turns
 * `Board.tall` into the precomputed `DrawnShape` the client writes onto the
 * drawn board — path data, label pill boxes and frame tabs worked out here
 * with the same canvas-kit helpers the server render uses, so the client
 * ships none of them.
 */
import type { Board, BoardShape } from '../types';
import { routeToPath, routeMidpoint } from './geometry';
import { frameTabLayout } from '@/app/(components)/canvas';
import { estimatePillSize } from '@/app/(components)/canvas/Link';
import type { DrawnShape } from './shape';

/** The tall arrangement of `board` as a `DrawnShape`, or `null` when it has none. */
export function tallShape(board: Board): DrawnShape | null {
  const tall: BoardShape | undefined = board.tall;
  if (!tall) return null;
  const nodes: DrawnShape['nodes'] = {};
  for (const block of board.blocks) {
    const box = tall.boxes[block.id];
    if (!box || !block.box) continue;
    nodes[block.id] = [box[0] - box[2] / 2, box[1] - box[3] / 2];
  }
  const links: DrawnShape['links'] = {};
  for (const wire of board.wires) {
    const w = tall.wires[wire.id];
    if (!w || !wire.route) continue;
    const entry: DrawnShape['links'][string] = { d: routeToPath(w.route, w.curve === true) };
    if (wire.text) {
      const [x, y] = w.cap ? w.cap.pt : routeMidpoint(w.route);
      const [pw, ph] = w.cap?.sz ?? wire.cap?.sz ?? estimatePillSize(wire.text);
      entry.pill = [x, y, pw, ph];
    }
    links[wire.id] = entry;
  }
  const frames: DrawnShape['frames'] = {};
  for (const frame of board.frames ?? []) {
    const box = tall.frames?.[frame.id];
    if (!box) continue;
    const { displayLabel, hitWidth } = frameTabLayout(frame.text, box[2]);
    frames[frame.id] = { x: box[0] - box[2] / 2, y: box[1] - box[3] / 2, w: box[2], h: box[3], tab: displayLabel, hit: hitWidth };
  }
  return { size: tall.size, nodes, links, frames };
}

