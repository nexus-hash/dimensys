'use client';

export interface LeftRailProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The left rail frame: Problem / Scenarios / Walkthroughs / Estimates
 * sections. This task builds the frame and its collapse behaviour only —
 * every section below is an empty, correctly-labelled slot; a later task
 * fills each with real content (requirement badges, the scenario list, the
 * walkthrough step list, the sizing calculators).
 *
 * On tablet/phone this same markup becomes an overlay drawer purely via CSS
 * (`.player-rail`'s `@media` rules in `globals.css`) — `open` there also
 * gates a click-catching backdrop and Escape, so it behaves like a drawer
 * without a second implementation.
 */
export function LeftRail({ open, onClose }: LeftRailProps) {
  return (
    <>
      <aside className="player-rail" aria-label="Problem, scenarios and walkthroughs">
        <div className="flex flex-col gap-6 p-4">
          <RailSection title="Problem" />
          <RailSection title="Scenarios" />
          <RailSection title="Walkthroughs" />
          <RailSection title="Estimates" />
          {/* T3.9's Break It toolbar slot (Kill/Spike/Partition/Slow/Flush) — only relevant in Break it mode; this task builds the empty, labelled section. */}
          <RailSection title="Tools" />
        </div>
      </aside>
      {/* Tablet/phone overlay backdrop: dismisses the drawer, never renders past `lg`. */}
      <button
        type="button"
        aria-label="Close rail overlay"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
        className={
          open
            ? 'fixed inset-0 z-[calc(var(--z-index-sheet)-1)] bg-[color-mix(in_srgb,var(--ink-primary)_24%,transparent)] lg:hidden'
            : 'hidden'
        }
      />
    </>
  );
}

function RailSection({ title }: { title: string }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-caption font-medium uppercase tracking-[.06em] text-ink-muted">{title}</h2>
      <div className="player-rail-slot" data-rail-slot={title.toLowerCase()} />
    </section>
  );
}
