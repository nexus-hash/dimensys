'use client';

import type { ReactNode } from 'react';
import { RequirementBadges } from '../hud/RequirementBadges';
import type { NeedView } from '../types';

export interface LeftRailProps {
  open: boolean;
  onClose: () => void;
  /** Requirement badges (T3.8) for the "Problem" section — see that section's own note below. */
  needs?: readonly NeedView[];
}

/**
 * The left rail frame: Problem / Scenarios / Walkthroughs / Estimates
 * sections. This task builds the frame and its collapse behaviour only —
 * every section below is an empty, correctly-labelled slot; a later task
 * fills each with real content (the problem title/meta pills, the scenario
 * list, the walkthrough step list, the sizing calculators). T3.8 fills only
 * the requirement badges inside "Problem", not the whole section.
 *
 * On tablet/phone this same markup becomes an overlay drawer purely via CSS
 * (`.player-rail`'s `@media` rules in `globals.css`) — `open` there also
 * gates a click-catching backdrop and Escape, so it behaves like a drawer
 * without a second implementation. Phone drops the rail from the layout
 * entirely (`globals.css`'s phone rules) — the requirement badges reach
 * phone through the bottom sheet's own Metrics tab instead (`PhoneSheet`),
 * which renders the same `<RequirementBadges>` alongside the HUD there.
 */
export function LeftRail({ open, onClose, needs = [] }: LeftRailProps) {
  return (
    <>
      <aside className="player-rail" aria-label="Problem, scenarios and walkthroughs">
        <div className="flex flex-col gap-6 p-4">
          <RailSection title="Problem">
            {needs.length > 0 ? <RequirementBadges needs={needs} /> : null}
          </RailSection>
          <RailSection title="Scenarios" />
          <RailSection title="Walkthroughs" />
          <RailSection title="Estimates" />
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

function RailSection({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-caption font-medium uppercase tracking-[.06em] text-ink-muted">{title}</h2>
      <div className="player-rail-slot" data-rail-slot={title.toLowerCase()}>
        {children}
      </div>
    </section>
  );
}
