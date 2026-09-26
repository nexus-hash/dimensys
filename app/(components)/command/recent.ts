/**
 * "Recent" palette items, persisted per-browser in localStorage. Every read
 * and write is wrapped in try/catch — private browsing, a full quota, or
 * disabled storage should degrade to "no recents", never throw.
 */

const STORAGE_KEY = 'dimensys_command_recent';
const MAX_RECENT = 8;

export function readRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function pushRecentId(id: string): void {
  try {
    const current = readRecentIds().filter((existing) => existing !== id);
    current.unshift(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, MAX_RECENT)));
  } catch {
    // Ignore — recents are a convenience, not a source of truth.
  }
}
