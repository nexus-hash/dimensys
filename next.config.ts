import type { NextConfig } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildAliasRedirects, legacy2dRedirect, type AliasCard } from "./app/(server)/engine/redirectRules";

/**
 * Tolerant `data/engine/catalog.json` read for the redirect rules below
 * (T3.13). Reads the file directly instead of importing `publicData.ts`'s
 * `loadCatalog`: that module imports the `server-only` guard, meant for the
 * app's React Server Component graph, not a plain Node config file.
 * Returns `[]` (no alias redirects, just the `/2d` rewrite below) when the
 * engine hasn't been synced yet — this must never fail the build.
 */
async function loadCatalogCardsForRedirects(): Promise<AliasCard[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data/engine/catalog.json"), "utf-8");
    const catalog = JSON.parse(raw) as { cards?: AliasCard[] };
    return Array.isArray(catalog.cards) ? catalog.cards : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  async redirects() {
    const cards = await loadCatalogCardsForRedirects();
    return [...buildAliasRedirects(cards), legacy2dRedirect()];
  },
};

export default nextConfig;
