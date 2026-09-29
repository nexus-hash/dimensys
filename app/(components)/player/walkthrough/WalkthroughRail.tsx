'use client';

import { Kbd } from '@/app/(components)/ui';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useActiveWalkthrough, useWalkthroughData } from './WalkthroughContext';
import { openWalkthrough } from './actions';

/**
 * The rail's Walkthroughs section: every walkthrough of the diagram as a
 * radio-style option; choosing one enters Walkthrough mode on its first
 * step. The one playing expands into its numbered step list (title plus a
 * one-line summary, the current step marked with an ink bar); any step can
 * be opened directly from there.
 */
export function WalkthroughRail() {
  const store = usePlayerStoreApi();
  const { walkthroughs } = useWalkthroughData();
  const active = useActiveWalkthrough();

  if (walkthroughs.length === 0) return <p className="text-caption text-ink-muted">No walkthroughs for this diagram yet.</p>;

  return (
    <div className="wt-rail">
      {walkthroughs.map((wt) => {
        const isActive = active?.walkthrough.id === wt.id;
        return (
          <div key={wt.id} className="wt-rail-item" data-walkthrough={wt.id}>
            <button
              type="button"
              className="wt-opt"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => openWalkthrough(store, walkthroughs, wt.id, isActive ? active.stepIndex : 0)}
            >
              <span className="wt-opt-dot" aria-hidden="true" />
              <span className="min-w-0">
                <span className="wt-opt-title">{wt.title}</span>
                <small>
                  {wt.steps.length} {wt.steps.length === 1 ? 'step' : 'steps'}
                </small>
              </span>
            </button>
            {isActive && (
              <>
                <ol className="wt-steps" aria-label={`${wt.title}: steps`}>
                  {wt.steps.map((step, i) => (
                    <li key={step.id} data-n={i + 1} aria-current={i === active.stepIndex ? 'step' : undefined}>
                      <button type="button" onClick={() => openWalkthrough(store, walkthroughs, wt.id, i)} aria-label={`Step ${i + 1}: ${step.title}`}>
                        <b>{step.title}</b>
                        {step.summary ? <span className="wt-step-sum">{step.summary}</span> : null}
                      </button>
                    </li>
                  ))}
                </ol>
                {wt.steps.length > 1 && (
                  <p className="wt-rail-hint">
                    <Kbd>←</Kbd> <Kbd>→</Kbd> move between steps
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
