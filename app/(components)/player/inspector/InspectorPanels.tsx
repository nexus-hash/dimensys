import type { ReactNode } from 'react';
import type { Board } from '../types';
import type { ElementIndex } from '../shell/selection';
import { NodeInspectorBody } from './NodeInspectorBody';
import { LinkInspectorBody } from './LinkInspectorBody';

/**
 * Every node's and link's inspector body, pre-rendered server-side (T3.6),
 * indexed by element id, same set as `buildElementIndex`. A diagram's sheet content is static, so it's built
 * once per page render; the client `Inspector`/`PhoneSheet` just look up
 * `panels[selection.id]` and show it — no markdown/shiki client bundle, no
 * per-selection fetch. See `DiagramPlayer.tsx` for where this gets called
 * and handed down.
 */
export function buildInspectorPanels(board: Board, index: ElementIndex): Record<string, ReactNode> {
  const panels: Record<string, ReactNode> = {};
  for (const node of board.blocks) panels[node.id] = <NodeInspectorBody node={node} />;
  for (const link of board.wires) panels[link.id] = <LinkInspectorBody link={link} index={index} />;
  return panels;
}
