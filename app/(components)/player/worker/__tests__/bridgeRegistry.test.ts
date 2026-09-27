import { describe, it, expect } from 'vitest';
import { registerBridge, unregisterBridge, getBridge } from '../bridgeRegistry';
import { createPlayerStore, initialPlayerState } from '../../store/playerStore';
import type { WorkerBridge } from '../bridge';

function fakeStore() {
  return createPlayerStore(
    initialPlayerState({ diagramId: 'd', revision: 1, hasSimulation: true, runtimeUrl: 'x' }),
  );
}

describe('bridgeRegistry', () => {
  it('is undefined before anything registers', () => {
    expect(getBridge(fakeStore())).toBeUndefined();
  });

  it('returns the registered bridge for its own store', () => {
    const store = fakeStore();
    const bridge = {} as WorkerBridge;
    registerBridge(store, bridge);
    expect(getBridge(store)).toBe(bridge);
  });

  it('keeps two stores independent', () => {
    const storeA = fakeStore();
    const storeB = fakeStore();
    const bridgeA = {} as WorkerBridge;
    registerBridge(storeA, bridgeA);
    expect(getBridge(storeB)).toBeUndefined();
    expect(getBridge(storeA)).toBe(bridgeA);
  });

  it('unregister is a no-op if a newer bridge already replaced it (restart case)', () => {
    const store = fakeStore();
    const first = {} as WorkerBridge;
    const second = {} as WorkerBridge;
    registerBridge(store, first);
    registerBridge(store, second);
    unregisterBridge(store, first); // stale — shouldn't remove `second`
    expect(getBridge(store)).toBe(second);
  });

  it('unregister removes the current entry', () => {
    const store = fakeStore();
    const bridge = {} as WorkerBridge;
    registerBridge(store, bridge);
    unregisterBridge(store, bridge);
    expect(getBridge(store)).toBeUndefined();
  });
});
