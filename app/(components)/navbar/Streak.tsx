import { FlameIcon } from '@/app/(components)/ui';

/**
 * Streak indicator: a flame plus a count. Visual only and inert — there's
 * no accounts/progress system yet to compute a real streak from, so this
 * never fakes a number. It shows "—" in place of a count, with a label
 * explaining why, rather than a live control.
 */
export default function Streak() {
  return (
    <span
      role="img"
      aria-label="Streak: coming soon, once accounts are available"
      title="Streak — coming soon"
      className="inline-flex items-center gap-1 px-1 font-mono text-[12px] font-semibold text-ink-secondary"
    >
      <FlameIcon className="h-3.5 w-3.5 flex-none text-brand" />
      <span aria-hidden="true">—</span>
    </span>
  );
}
