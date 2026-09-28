'use client';

import { IconButton, Kbd, Button } from '@/app/(components)/ui';
import { CloseIcon } from '@/app/(components)/ui/icons';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useActiveWalkthrough, useWalkthroughData } from './WalkthroughContext';
import { exitWalkthrough, stepBy } from './actions';
import { stepKey } from './model';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

/**
 * The narration card in the dock under the board, while a walkthrough plays:
 * where you are (walkthrough · step n / N), the step's title and its
 * narration, then the progress dots and Prev / Next / Exit. Renders nothing
 * outside Walkthrough mode, so the dock's narration slot collapses.
 */
export function WalkthroughNarration() {
  const store = usePlayerStoreApi();
  const { walkthroughs, narration, breakAvailable } = useWalkthroughData();
  const active = useActiveWalkthrough();
  if (!active) return null;

  const { walkthrough, stepIndex, step } = active;
  const total = walkthrough.steps.length;
  const first = stepIndex === 0;
  const last = stepIndex === total - 1;
  const body = narration[stepKey(walkthrough.id, step.id)];

  return (
    <div className="wt-narr" data-walkthrough-narration={walkthrough.id} data-step={stepIndex + 1}>
      <div className="wt-narr-body" key={`${walkthrough.id}/${step.id}`}>
        <p className="wt-narr-k">
          <span className="truncate">{walkthrough.title}</span>
          <span aria-hidden="true">·</span>
          <span className="flex-none">
            step {stepIndex + 1} / {total}
          </span>
        </p>
        <h2 className="wt-narr-title">{step.title}</h2>
        {body ? <div className="wt-narr-md">{body}</div> : step.summary ? <p className="wt-narr-md">{step.summary}</p> : null}
      </div>
      <div className="wt-narr-acts">
        {total > 1 && (
          <div
            className="wt-dots"
            role="progressbar"
            aria-label="Walkthrough progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={stepIndex + 1}
            aria-valuetext={`Step ${stepIndex + 1} of ${total}`}
          >
            {walkthrough.steps.map((s, i) => (
              <span key={s.id} className="wt-dot" data-state={i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'} />
            ))}
          </div>
        )}
        <div className="wt-narr-btns">
          <IconButton size="sm" aria-label="Previous step" title="Previous step (←)" disabled={first} onClick={() => stepBy(store, walkthroughs, -1)}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="sm" aria-label="Next step" title="Next step (→)" disabled={last} onClick={() => stepBy(store, walkthroughs, 1)}>
            <ChevronRightIcon />
          </IconButton>
          {last && breakAvailable && (
            <Button variant="glass" size="sm" onClick={() => store.setState({ mode: 'break' })}>
              Now break it <Kbd className="ml-1">2</Kbd>
            </Button>
          )}
          <IconButton size="sm" aria-label="Exit walkthrough" title="Exit walkthrough" onClick={() => exitWalkthrough(store)}>
            <CloseIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
