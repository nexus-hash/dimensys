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
      {/* One line, like an address bar: the path stays whole, the query is ellipsised if it can't fit. */}
      <div className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-line-strong bg-surface-raised pl-3.5 pr-2 font-mono text-[13px] text-ink-muted shadow-elevation-1">
        <LinkIcon />
        <span className="min-w-0 flex-1 truncate" title="dimensys.dev/solutions/url-shortener?s=cache-outage&t=34">
          dimensys.dev/solutions/url-shortener
          <span className="font-medium text-ink-primary">?s=cache-outage&amp;t=34</span>
        </span>
      </div>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4 flex-none text-ink-secondary"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
