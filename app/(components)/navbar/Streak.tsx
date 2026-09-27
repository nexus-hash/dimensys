/**
 * Streak indicator: a flame glyph plus a count. Visual only and inert —
 * there's no accounts/progress system yet to compute a real streak from, so
 * this never fakes a number. It shows "—" in place of a count and is
 * `aria-disabled` with a label explaining why, rather than a live control.
 */
export default function Streak() {
  return (
    <span
      aria-disabled="true"
      aria-label="Streak: coming soon, once accounts are available"
      title="Streak — coming soon"
      className="inline-flex h-8 items-center gap-1 rounded-full px-2 font-mono text-label text-ink-muted"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="flex-none"
      >
        <path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-.5-2 1.5 1 2.5 3 2.5 5a6 6 0 0 1-12 0c0-4 3-5 4-10Z" />
      </svg>
      <span aria-hidden="true">—</span>
    </span>
  );
}
