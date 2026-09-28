import type { CalcView, KnobView, SwitchView } from '../types';

/**
 * What a detail sheet's live sections need beyond their own part: the
 * diagram's live switches (a tradeoff part follows one by id), its
 * calculators (a calc part names one by id) and the element the sheet
 * belongs to (a sparkline plots that element's own metric columns). Built
 * once per page by `buildInspectorPanels`.
 */
export interface SectionContext {
  /** Id of the node (or framed group) whose sheet this is. */
  elementId: string;
  switches: readonly SwitchView[];
  calcs: readonly CalcView[];
  /** Nodes the viewer may scale by hand; the inspector shows a Scale control for these. */
  knobs?: readonly KnobView[];
}

/** The diagram-wide half of `SectionContext`, handed to `buildInspectorPanels`. */
export type InspectorData = Omit<SectionContext, 'elementId'>;

export const NO_INSPECTOR_DATA: InspectorData = { switches: [], calcs: [] };
