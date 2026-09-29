import type { ReactNode } from 'react';
import type { Board } from '../types';
import type { ElementIndex } from '../shell/selection';
import { NodeInspectorBody } from './NodeInspectorBody';
import { LinkInspectorBody } from './LinkInspectorBody';
import { NO_INSPECTOR_DATA, type InspectorData } from './context';

/**
 * Every node's and link's inspector body, pre-rendered server-side (T3.6),
 * indexed by element id, same set as `buildElementIndex` (a framed group's
 * panel is keyed by its frame id). A diagram's sheet content is static, so it's built
 * once per page render; the client `Inspector`/`PhoneSheet` just look up
 * `panels[selection.id]` and show it — no markdown/shiki client bundle, no
 * per-selection fetch. See `DiagramPlayer.tsx` for where this gets called
 * and handed down. `data` carries the diagram's live switches and
 * calculators, which the tradeoff and calculator sections look up by id.
 */
export function buildInspectorPanels(board: Board, index: ElementIndex, data: InspectorData = NO_INSPECTOR_DATA): Record<string, ReactNode> {
  const panels: Record<string, ReactNode> = {};
  for (const node of board.blocks) panels[node.id] = <NodeInspectorBody node={node} data={data} />;
  for (const link of board.wires) panels[link.id] = <LinkInspectorBody link={link} index={index} />;
  for (const frame of board.frames ?? []) panels[frame.id] = <NodeInspectorBody node={frame} data={data} />;
  return panels;
}
