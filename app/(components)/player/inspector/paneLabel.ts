/**
 * Humanises a `Part.pane` id (`overview`, `architecture`, `loadTest`, …)
 * into a tab label (`Overview`, `Architecture`, `Load Test`). Pure so the
 * tab-grouping logic in `NodeInspectorBody` can be unit tested without
 * rendering anything.
 */
export function paneLabel(pane: string): string {
  const words = pane
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return pane;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
