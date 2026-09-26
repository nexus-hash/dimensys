'use client';

import { useSyncExternalStore } from 'react';

// Never actually notifies — there is nothing to subscribe to. The point of
// this hook is purely to distinguish the server-rendered pass (and the first
// client render, which must match it for hydration) from every render that
// follows, which is exactly what useSyncExternalStore's server-snapshot vs.
// client-snapshot split gives us, without a setState-in-effect round trip.
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Returns `false` during server rendering and the initial client render,
 * then `true` for every render after hydration completes. Use this instead of
 * the `useState(false)` + `useEffect(() => setMounted(true), [])` pattern to
 * gate client-only rendering — it avoids the extra render pass caused by
 * calling setState synchronously inside an effect.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
