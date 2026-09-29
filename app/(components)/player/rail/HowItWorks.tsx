'use client';

import { useId, useSyncExternalStore } from 'react';
import { Button } from '@/app/(components)/ui';
import { CloseIcon } from '@/app/(components)/ui/icons';
import { usePlayerStoreApi } from '../store/PlayerStoreProvider';
import { useWalkthroughData } from '../walkthrough/WalkthroughContext';
import { openWalkthrough } from '../walkthrough/actions';
import { RouteIcon } from './icons';

/** Per-viewer flag: the first-visit card was dismissed or its tour started. */
export const HOW_SEEN_KEY = 'dimensys:how-it-works-seen';
const CHANGE_EVENT = 'dimensys:how-it-works';

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(HOW_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(HOW_SEEN_KEY, '1');
  } catch {
    // Storage blocked: the card still hides for this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Without storage the flag lives for the page view only.
let seenThisView = false;

/** Tests only: forget a dismissal made without storage. */
export function resetHowItWorksSeen() {
  seenThisView = false;
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getSnapshot = () => seenThisView || readSeen();
// The server can't know: render nothing, so a returning viewer never sees it flash.
const getServerSnapshot = () => true;

/**
 * "New here? How it works": a card for first-time viewers that starts the
 * diagram's first walkthrough. Dismissing it (or starting the tour) hides it
 * for good in this browser.
 */
export function HowItWorks() {
  const store = usePlayerStoreApi();
  const { walkthroughs } = useWalkthroughData();
  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const titleId = useId();
  if (seen || walkthroughs.length === 0) return null;

  const dismiss = () => {
    seenThisView = true;
    markSeen();
  };

  return (
    <div className="rail-how" role="note" aria-labelledby={titleId} data-rail-how>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="rail-how-eyebrow">New here?</p>
          <h3 id={titleId} className="rail-how-title">
            How it works
          </h3>
        </div>
        <Button variant="ghost" size="sm" iconOnly aria-label="Dismiss How it works" className="rail-how-x" onClick={dismiss}>
          <CloseIcon />
        </Button>
      </div>
      <p className="rail-how-text">A short tour of the running system: where a request goes, and why it&apos;s fast.</p>
      <div>
        <Button
          size="sm"
          onClick={() => {
            dismiss();
            openWalkthrough(store, walkthroughs, walkthroughs[0].id, 0);
          }}
        >
          <RouteIcon />
          Start the tour
        </Button>
      </div>
    </div>
  );
}
