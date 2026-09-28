'use client';

import type { ReactNode } from 'react';
import { RequirementBadges } from '../hud/RequirementBadges';
import { WalkthroughRail } from '../walkthrough/WalkthroughRail';
import { ScenarioList } from '../story/ScenarioRail';
import type { NeedView } from '../types';
import type { RailData } from '../rail/data';
import { ProblemHeader } from '../rail/ProblemHeader';
import { HowItWorks } from '../rail/HowItWorks';
import { RequestPaths } from '../rail/RequestPaths';
import { RailEstimates } from '../rail/RailEstimates';
import '../rail/rail.css';

export interface LeftRailProps {
  open: boolean;
  onClose: () => void;
  /** Requirement badges (T3.8) for the "Problem" section — see that section's own note below. */
  needs?: readonly NeedView[];
  /** Problem header, request paths and the design-wide estimate (`buildRailData`). */
  rail?: RailData;
}

/**
 * The left rail: Problem (title, level/difficulty/time pills and the live
 * requirement badges), the first-visit "How it works" card, the request
 * paths (hover or focus to trace one on the board), Scenarios, Walkthroughs
 * (every walkthrough, and the playing one's steps) and Estimates (the
 * design-wide sizing calculator). Each section's content is its own
 * component; this file only lays them out.
 *
 * On tablet/phone this same markup becomes an overlay drawer purely via CSS
 * (`.player-rail`'s `@media` rules in `globals.css`) — `open` there also
 * gates a click-catching backdrop and Escape, so it behaves like a drawer
 * without a second implementation. Phone drops the rail from the layout
 * entirely (`globals.css`'s phone rules) — the requirement badges reach
 * phone through the bottom sheet's own Metrics tab instead (`PhoneSheet`),
 * which renders the same `<RequirementBadges>` alongside the HUD there.
 */
export function LeftRail({ open, onClose, needs = [], rail }: LeftRailProps) {
  return (
    <>
      <aside className="player-rail" aria-label="Problem, scenarios and walkthroughs">
        <div className="flex flex-col gap-6 p-4">
          <RailSection title="Problem">
            {rail ? <ProblemHeader problem={rail.problem} /> : null}
            {needs.length > 0 ? <RequirementBadges needs={needs} /> : null}
          </RailSection>
          <HowItWorks />
          {rail && rail.lanes.length > 0 ? (
            <RailSection title="Request paths" hint="hover to trace">
              <RequestPaths lanes={rail.lanes} />
            </RailSection>
          ) : null}
          <RailSection title="Scenarios">
            <ScenarioList />
          </RailSection>
          <RailSection title="Walkthroughs">
            <WalkthroughRail />
          </RailSection>
          <RailSection title="Estimates">
            {rail?.estimate ? <RailEstimates calc={rail.estimate} /> : null}
          </RailSection>
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

function RailSection({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="rail-eyebrow">
        <span>{title}</span>
        {hint ? <span className="rail-eyebrow-hint">{hint}</span> : null}
      </h2>
      <div className="player-rail-slot grid gap-3" data-rail-slot={title.toLowerCase()}>
        {children}
      </div>
    </section>
  );
}
