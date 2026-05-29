import { useState, useEffect } from 'react';

export function useConceptProgress(conceptId: string) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dimensys_concept_progress');
      if (stored) {
        const data = JSON.parse(stored);
        if (data[conceptId]) {
          setProgress(data[conceptId]);
        }
      }
    } catch (e) {
      console.error('Failed to read progress', e);
    }
  }, [conceptId]);

  return progress;
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
