// Client-safe exports only: the shell's client components import this
// barrel. The server-rendered panel builders (`buildInspectorPanels`,
// `NodeInspectorBody`, `LinkInspectorBody`, `SectionRenderer`) are imported
// from their own modules, because the section registry reaches build-time
// data loaders that must never enter a client bundle.
export { EmptyInspectorBody } from './EmptyInspectorBody';
export { InspectorTabs } from './InspectorTabs';
export { paneLabel } from './paneLabel';
