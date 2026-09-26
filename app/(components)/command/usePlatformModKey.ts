'use client';

import { useSyncExternalStore } from 'react';
import { detectModLabel } from './keys';

// The platform never changes mid-session; this only exists so the client's
// first render (which can read `navigator`) matches what the server rendered
// (which can't) — same pattern as the navbar search box's shortcut badge.
function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return detectModLabel(window.navigator?.userAgent);
}

function getServerSnapshot() {
  return '⌘';
}

/** `"⌘"` on macOS, `"Ctrl"` elsewhere — safe to call during SSR. */
export function usePlatformModKey(): string {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
