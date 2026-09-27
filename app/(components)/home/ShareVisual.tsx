/**
 * "04 Share" showcase visual (S4.6a). The URL-as-state feature doesn't
 * exist yet (the player's own top bar Share control is still disabled —
 * `PlayerShell`/`TopBar`) so this renders the honest shape of the future
 * URL (a real path plus the query keys the schema already reserves for a
 * scenario/second) rather than a fake screenshot with invented metrics. The
 * "Coming soon" pill lives once, in `ShowcaseSection` itself.
 */
export function ShareVisual() {
  return (
    <div className="canvas-surface w-full rounded-card border border-line-hairline p-5 sm:p-6">
      <div className="flex items-center gap-2 overflow-x-auto rounded-control border border-line-hairline bg-surface-raised px-3 py-2 font-mono text-mono-sm text-ink-secondary">
        <span className="text-ink-primary">dimensys.dev/solutions/url-shortener</span>
        <span className="text-ink-muted">?s=cache-outage&amp;t=34</span>
      </div>
    </div>
  );
}
