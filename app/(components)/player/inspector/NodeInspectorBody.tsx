import { TabsContent } from '@/app/(components)/ui';
import type { Part, Sheet } from '../types';
import { NO_INSPECTOR_DATA, type InspectorData, type SectionContext } from './context';
import { EmptyInspectorBody } from './EmptyInspectorBody';
import { InspectorTabs } from './InspectorTabs';
import { SectionRenderer, isSimpleShape } from './sections';
import { paneLabel } from './paneLabel';
import { ScaleControl } from './ScaleControl';
import { RestoreNode } from '../breakit/InEffect';

/** Groups a sheet's parts by `pane`, preserving first-appearance order — the order tabs are shown in, per the brief ("one tab per pane, in first-appearance order"), before the "Coming soon"-only reordering below. */
function groupByPane(parts: Part[]): Map<string, Part[]> {
  const panes = new Map<string, Part[]>();
  for (const part of parts) {
    const list = panes.get(part.pane);
    if (list) list.push(part);
    else panes.set(part.pane, [part]);
  }
  return panes;
}

/**
 * First-appearance order, except any pane made *entirely* of deferred/
 * "Coming soon" sections (a shape this app has never seen) is moved after every pane with at least one real
 * section — the first tab a person lands on should have something to
 * read, not just chips. A pane with a mix of real and unknown parts stays
 * in its original spot; only an *all*-unknown pane is demoted. Both
 * groups keep their own relative first-appearance order (a stable sort by
 * construction: `Array.filter` never reorders).
 */
function orderPaneIds(panes: Map<string, Part[]>): string[] {
  const ids = [...panes.keys()];
  const hasRealContent = (id: string) => (panes.get(id) ?? []).some((part) => isSimpleShape(part.shape));
  return [...ids.filter(hasRealContent), ...ids.filter((id) => !hasRealContent(id))];
}

/** `Overview` if the node has that pane, else the first tab in `orderedIds` (which is already real-content-first — see `orderPaneIds`). */
function defaultPaneId(orderedIds: string[]): string {
  return orderedIds.find((id) => id.toLowerCase() === 'overview') ?? orderedIds[0];
}

function PaneSections({ parts, ctx }: { parts: Part[]; ctx: SectionContext }) {
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4">
      {parts.map((part, i) => (
        <SectionRenderer key={`${part.shape}-${i}`} part={part} ctx={ctx} />
      ))}
    </div>
  );
}

/**
 * A node's (or a framed group's) inspector body (T3.6): every part of its `sheet`, grouped into
 * one tab per pane. A sheet with a single pane skips the tab strip
 * entirely (rendered flat) — the brief calls this out explicitly, and it
 * also means most nodes in the current fixtures (which only use
 * `operations`/`overview`/`architecture` when they have more to say) don't
 * pay for a tab control they don't need.
 */
export function NodeInspectorBody({ node, data = NO_INSPECTOR_DATA }: { node: { id: string; text: string; sheet?: Sheet }; data?: InspectorData }) {
  const parts = node.sheet?.parts ?? [];
  const ctx: SectionContext = { ...data, elementId: node.id };
  const knob = data.knobs?.find((k) => k.el === node.id);
  const scale = (
    <>
      <RestoreNode id={node.id} />
      {knob ? <ScaleControl knob={knob} label={node.text} /> : null}
    </>
  );
  if (parts.length === 0) return <>{scale}<EmptyInspectorBody /></>;

  const panes = groupByPane(parts);
  const orderedIds = orderPaneIds(panes);

  if (orderedIds.length <= 1) {
    return (
      <>
        {scale}
        <PaneSections parts={panes.get(orderedIds[0]) ?? []} ctx={ctx} />
      </>
    );
  }

  const items = orderedIds.map((id) => ({ value: id, label: paneLabel(id) }));
  return (
    <>
    {scale}
    <InspectorTabs items={items} defaultValue={defaultPaneId(orderedIds)} ariaLabel={`${node.text} detail tabs`}>
      {orderedIds.map((id) => (
        <TabsContent key={id} value={id} className="min-w-0 focus-visible:outline-none">
          <PaneSections parts={panes.get(id) ?? []} ctx={ctx} />
        </TabsContent>
      ))}
    </InspectorTabs>
    </>
  );
}
