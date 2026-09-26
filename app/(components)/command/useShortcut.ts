'use client';

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, useId } from 'react';
import { shortcutRegistry, sortGroups } from './registry';
import type { ShortcutDef, ShortcutRegistration } from './types';

/**
 * Registers a shortcut for the lifetime of the calling component. The
 * handler is kept in a ref so callers can pass an inline closure without
 * re-registering (and re-triggering conflict detection) on every render.
 */
export function useShortcut(def: ShortcutRegistration, handler: (event: KeyboardEvent) => void): void {
  const autoId = useId();
  const id = def.id ?? autoId;
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  const { keys, label, group, when, allowWhileTyping, hidden } = def;

  useEffect(() => {
    const entry: ShortcutDef = {
      id,
      keys,
      label,
      group,
      when,
      allowWhileTyping,
      hidden,
      handler: (event) => handlerRef.current(event),
    };
    return shortcutRegistry.register(entry);
  }, [id, keys, label, group, when, allowWhileTyping, hidden]);
}

/** Pushes a shortcut scope active for as long as `active` is true (and the component is mounted). */
export function useShortcutScope(scope: string, active = true): void {
  useEffect(() => {
    if (!active) return;
    shortcutRegistry.pushScope(scope);
    return () => shortcutRegistry.popScope(scope);
  }, [scope, active]);
}

function subscribe(listener: () => void) {
  return shortcutRegistry.subscribe(listener);
}

// A stable reference for the (never-hydrated-differently) server snapshot —
// `() => []` would allocate a new array every call, which useSyncExternalStore
// treats as "the store changed" on every render and loops forever.
const EMPTY_SHORTCUTS: ShortcutDef[] = [];
function getServerSnapshot(): ShortcutDef[] {
  return EMPTY_SHORTCUTS;
}

/** Live, grouped view of every currently-registered, currently-active shortcut (for the gallery / cheat sheet). */
export function useRegisteredShortcuts(): { group: string; shortcuts: ShortcutDef[] }[] {
  const entries = useSyncExternalStore(subscribe, () => shortcutRegistry.visible(), getServerSnapshot);
  const groups = new Map<string, ShortcutDef[]>();
  for (const entry of entries) {
    const list = groups.get(entry.group) ?? [];
    list.push(entry);
    groups.set(entry.group, list);
  }
  return sortGroups([...groups.keys()]).map((group) => ({
    group,
    shortcuts: groups.get(group)!.sort((a, b) => a.label.localeCompare(b.label)),
  }));
}
