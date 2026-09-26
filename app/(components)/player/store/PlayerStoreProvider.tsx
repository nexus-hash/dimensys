'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPlayerStore, initialPlayerState, type PlayerState, type PlayerStore } from './playerStore';
import type { PlayerBootstrap } from '../types';

const PlayerStoreContext = createContext<PlayerStore | null>(null);

/** Creates one store per mounted player and exposes it to the islands below. */
export function PlayerStoreProvider({ bootstrap, children }: { bootstrap: PlayerBootstrap; children?: ReactNode }) {
  const [store] = useState(() => createPlayerStore(initialPlayerState(bootstrap)));
  return <PlayerStoreContext.Provider value={store}>{children}</PlayerStoreContext.Provider>;
}

/** The raw store, for imperative readers (worker bridge, particle rAF loop). */
export function usePlayerStoreApi(): PlayerStore {
  const store = useContext(PlayerStoreContext);
  if (!store) throw new Error('usePlayerStore must be used inside <PlayerStoreProvider>');
  return store;
}

/**
 * Subscribes to one derived value. The selector must return a stable value
 * (a primitive, or a slice object the store only replaces on change), or it
 * re-renders on every store update.
 */
export function usePlayerStore<T>(selector: (state: PlayerState) => T): T {
  const store = usePlayerStoreApi();
  const get = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, get, get);
}
