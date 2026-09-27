/**
 * Pure redirect-rule builders for `next.config.ts` (T3.13). Kept separate
 * from `publicData.ts` (which imports `server-only`, a guard meant for
 * React Server Component modules) so this can be imported directly from
 * `next.config.ts` — a plain Node config file, not part of the app's
 * client/server component graph — and unit-tested without touching the
 * filesystem.
 *
 * `next.config.ts` does its own tolerant `catalog.json` read and passes the
 * parsed cards in here; this module only maps data to redirect rules.
 */

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

/** The slice of `CatalogCard` these builders need. */
export interface AliasCard {
  id: string;
  formerly?: string[];
}

/**
 * One permanent redirect per catalog `formerly` id: an old
 * `/solutions/<formerly>` path (the old TSX-codegen pages used pre-rename
 * ids as their route segment, e.g. `url-shortener-01`, `hld-netflix`) lands
 * on the current canonical `/solutions/<id>`. Query strings survive (Next
 * passes them through automatically), so old share links keep working.
 */
export function buildAliasRedirects(cards: readonly AliasCard[]): RedirectRule[] {
  const rules: RedirectRule[] = [];
  for (const card of cards) {
    for (const oldId of card.formerly ?? []) {
      if (!oldId || oldId === card.id) continue;
      rules.push({ source: `/solutions/${oldId}`, destination: `/solutions/${card.id}`, permanent: true });
    }
  }
  return rules;
}

/**
 * The old `/2d/[problemId]` viewer (T3.13: removed) becomes the equivalent
 * `/solutions/<id>` path. This rule needs no catalog data — it's a plain
 * segment rename — so it's always present even when `catalog.json` hasn't
 * been synced yet. A former/prefixed id (e.g. `/2d/hld-netflix`) lands on
 * `/solutions/hld-netflix`, which `buildAliasRedirects`' rule for that same
 * id then redirects a second time to the canonical `/solutions/netflix`.
 */
export function legacy2dRedirect(): RedirectRule {
  return { source: '/2d/:problemId', destination: '/solutions/:problemId', permanent: true };
}
