import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dimensys_concept_progress';

function readStoredProgress(conceptId: string): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data[conceptId]) {
        return data[conceptId];
      }
    }
  } catch (e) {
    console.error('Failed to read progress', e);
  }
  return 0;
}

// No external mutation of localStorage notifies listeners in this app, so the
// store never changes out from under us — subscribe is a no-op.
function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return 0;
}

export function useConceptProgress(conceptId: string) {
  return useSyncExternalStore(subscribe, () => readStoredProgress(conceptId), getServerSnapshot);
}

export function saveConceptProgress(conceptId: string, percentage: number) {
  try {
    const stored = localStorage.getItem('dimensys_concept_progress');
    const data = stored ? JSON.parse(stored) : {};
    
    // Only update if the new percentage is higher (high-water mark)
    // Add small buffer so reaching 95% counts as 100% since scrollHeight calculation can be slightly off
    let p = Math.min(100, Math.max(0, percentage));
    if (p > 95) p = 100;
    
    if (!data[conceptId] || p > data[conceptId]) {
      data[conceptId] = p;
      localStorage.setItem('dimensys_concept_progress', JSON.stringify(data));
    }
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}
