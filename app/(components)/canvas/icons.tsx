import type { HldNodeType } from './types';

/**
 * Node-type icon set: redrawn on the prototype's 24px grid with
 * a 1.5px stroke so product and UI icons match. Icons are pure path data —
 * rendered with `stroke="currentColor" fill="none"` by `NodeIcon` so they
 * inherit `--ink-secondary` from the node body (nodes are monochrome, the design spec).
 *
 * The prototype (`prototype/index.html`'s `IC` map) only draws icons for the
 * subset of types its one demo diagram uses (client/lb/server/cache/db/queue/
 * worker). The remaining `NodeType` members (`apiGateway`, `orchestrator`,
 * `cdn`, `objectStore`, `cloud`, `subSystem`) have no prototype artwork —
 * these are drawn fresh here, in the same visual language (see DS5 SPEC
 * GAPS: the prototype should grow reference art for them).
 */
const ICON_PATHS: Record<string, string> = {
  // Reused verbatim from the prototype's `IC` map.
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/>',
  lb: '<path d="M3 12h5M8 12l4-6h8M8 12l4 6h8M17 3l3 3-3 3M17 15l3 3-3 3"/>',
  api: '<rect x="3.5" y="4" width="17" height="7" rx="1.5"/><rect x="3.5" y="13" width="17" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  cache: '<path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12l1-8z"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  bus: '<path d="M3 7h13M3 12h18M3 17h13"/><circle cx="19" cy="7" r="1.6"/><circle cx="19" cy="17" r="1.6"/>',
  worker: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  message: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  // New (DS5): no prototype artwork, drawn to match.
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.7A4.5 4.5 0 0 0 7 18z"/>',
  bucket:
    '<path d="M5 8h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z"/><path d="M3.5 8h17M8 8V6a4 4 0 0 1 8 0v2"/>',
};

/** The default icon key for each node type. */
const TYPE_DEFAULT: Record<HldNodeType, string> = {
  client: 'web',
  lb: 'lb',
  apiGateway: 'shield',
  server: 'api',
  worker: 'worker',
  orchestrator: 'route',
  cache: 'cache',
  cdn: 'cloud',
  db: 'db',
  objectStore: 'bucket',
  queue: 'bus',
  messageBus: 'message',
  cloud: 'cloud',
  external: 'external',
  subSystem: 'layers',
};

/**
 * Variant overrides.
 * Where the schema's variant doesn't warrant genuinely different artwork
 * (e.g. `db` variants are all the same cylinder glyph — the `type · variant`
 * mono sub-label carries the distinction, the design spec), the type default is kept.
 */
const VARIANT_OVERRIDE: Partial<Record<HldNodeType, Record<string, string>>> = {
  client: { web: 'web', mobile: 'mobile' },
};

function nodeIconKey(type: HldNodeType, variant?: string): string {
  if (variant) {
    const perType = VARIANT_OVERRIDE[type];
    const override = perType?.[variant];
    if (override) return override;
  }
  return TYPE_DEFAULT[type];
}

/** Renders a 24×24 node-type icon. Purely decorative — the node's own
 * `aria-label` carries the accessible name. */
export function NodeIcon({ type, variant, className }: { type: HldNodeType; variant?: string; className?: string }) {
  const key = nodeIconKey(type, variant);
  const d = ICON_PATHS[key] ?? ICON_PATHS.web;
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
