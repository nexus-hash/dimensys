/**
 * View Transitions helper — wraps the platform `document.startViewTransition`
 * API (not a framework abstraction over it) so any DOM update can opt into a
 * crossfade/morph when the browser supports it, and falls back to an
 * instant, synchronous swap everywhere else: unsupported browsers, and
 * reduced motion (an "instant swap" is exactly the browser's own no-support
 * behavior, so this keeps both paths identical).
 */

import { isMotionReduced } from './reducedMotion';

export interface RunViewTransitionOptions {
  /** Force reduced-motion behavior regardless of the ambient signals (for tests / the gallery toggle). */
  reduced?: boolean;
}

type DocumentWithViewTransitions = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    ready: Promise<void>;
    finished: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

/**
 * Runs `update` (a synchronous DOM mutation, per the platform API's
 * contract) inside a View Transition when supported and motion isn't
 * reduced; otherwise runs it directly with no transition.
 *
 * Returns a promise that resolves once the transition (or the plain update)
 * has finished, and never rejects — a transition the browser aborts (e.g. a
 * concurrent one) resolves like an instant swap.
 */
export function runViewTransition(update: () => void | Promise<void>, options: RunViewTransitionOptions = {}): Promise<void> {
  const reduced = options.reduced ?? isMotionReduced();
  const doc = typeof document !== 'undefined' ? (document as DocumentWithViewTransitions) : undefined;

  if (!doc?.startViewTransition || reduced) {
    return Promise.resolve(update()).then(() => undefined);
  }

  try {
    const transition = doc.startViewTransition(update);
    return transition.finished.catch(() => undefined);
  } catch {
    return Promise.resolve(update()).then(() => undefined);
  }
}

/** Whether the platform View Transitions API is available in this environment. */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof (document as DocumentWithViewTransitions).startViewTransition === 'function';
}
