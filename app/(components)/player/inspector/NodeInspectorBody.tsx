import { TabsContent } from '@/app/(components)/ui';
import type { NodeView, Part } from '../types';
import { EmptyInspectorBody } from './EmptyInspectorBody';
import { InspectorTabs } from './InspectorTabs';
import { SectionRenderer } from './sections';
import { paneLabel } from './paneLabel';

/** Groups a sheet's parts by `pane`, preserving first-appearance order — the order tabs are shown in, per the brief ("one tab per pane, in first-appearance order"). */
function groupByPane(parts: Part[]): Map<string, Part[]> {
  const panes = new Map<string, Part[]>();
  for (const part of parts) {
    const list = panes.get(part.pane);
    if (list) list.push(part);
    else panes.set(part.pane, [part]);
  }
  return panes;
}

function PaneSections({ parts }: { parts: Part[] }) {
  return (
    <div className="flex flex-col gap-6 p-4">
      {parts.map((part, i) => (
        <SectionRenderer key={`${part.shape}-${i}`} part={part} />
      ))}
    </div>
  );
}

/**
 * A node's inspector body (T3.6): every part of its `sheet`, grouped into
 * one tab per pane. A sheet with a single pane skips the tab strip
 * entirely (rendered flat) — the brief calls this out explicitly, and it
 * also means most nodes in the current fixtures (which only use
 * `operations`/`overview`/`architecture` when they have more to say) don't
 * pay for a tab control they don't need.
 */
export function NodeInspectorBody({ node }: { node: NodeView }) {
  const parts = node.sheet?.parts ?? [];
  if (parts.length === 0) return <EmptyInspectorBody />;

  const panes = groupByPane(parts);
  const paneIds = [...panes.keys()];

  if (paneIds.length <= 1) {
    return <PaneSections parts={panes.get(paneIds[0]) ?? []} />;
  }

  const items = paneIds.map((id) => ({ value: id, label: paneLabel(id) }));
  return (
    <InspectorTabs items={items} ariaLabel={`${node.text} detail tabs`}>
      {paneIds.map((id) => (
        <TabsContent key={id} value={id} className="focus-visible:outline-none">
          <PaneSections parts={panes.get(id) ?? []} />
        </TabsContent>
      ))}
    </InspectorTabs>
  );
}
