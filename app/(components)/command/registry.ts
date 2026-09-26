import { GLOBAL_SCOPE, type ShortcutDef } from './types';
import { isTypingTarget, isUnmodifiedCombo } from './keys';

type Listener = () => void;

/**
 * The shortcut registry: a small external store (subscribe via
 * `useSyncExternalStore`, e.g. `useRegisteredShortcuts` below) that holds
 * every currently-mounted shortcut, keyed by id. `dispatch` is fed real
 * `KeyboardEvent`s by `CommandProvider` (mounted once in the app shell) and
 * is also called directly in tests.
 *
 * Scoping: a shortcut with no `when` (or `when: "global"`) always fires.
 * Anything else only fires while that scope has been pushed active via
 * `pushScope`/`useShortcutScope` — this is how, e.g., a demo surface can
 * register shortcuts that don't leak outside it.
 */
class ShortcutRegistry {
  private entries = new Map<string, ShortcutDef>();
  private listeners = new Set<Listener>();
  private scopeCounts = new Map<string, number>();

  register(def: ShortcutDef): () => void {
    if (process.env.NODE_ENV !== 'production') {
      this.warnOnConflict(def);
    }
    this.entries.set(def.id, def);
    this.notify();
    return () => this.unregister(def.id);
  }

  unregister(id: string): void {
    if (this.entries.delete(id)) this.notify();
  }

  private warnOnConflict(def: ShortcutDef): void {
    const scope = def.when ?? GLOBAL_SCOPE;
    for (const existing of this.entries.values()) {
      if (existing.id === def.id) continue;
      const existingScope = existing.when ?? GLOBAL_SCOPE;
      if (existing.keys === def.keys && existingScope === scope) {
        console.warn(
          `[shortcuts] "${def.keys}" is bound to both "${existing.id}" and "${def.id}" in scope "${scope}". ` +
            'The most recently registered handler wins.',
        );
      }
    }
  }

  pushScope(scope: string): void {
    this.scopeCounts.set(scope, (this.scopeCounts.get(scope) ?? 0) + 1);
    this.notify();
  }

  popScope(scope: string): void {
    const count = this.scopeCounts.get(scope) ?? 0;
    if (count <= 1) this.scopeCounts.delete(scope);
    else this.scopeCounts.set(scope, count - 1);
    this.notify();
  }

  isScopeActive(scope: string | undefined): boolean {
    const s = scope ?? GLOBAL_SCOPE;
    if (s === GLOBAL_SCOPE) return true;
    return (this.scopeCounts.get(s) ?? 0) > 0;
  }

  list(): ShortcutDef[] {
    return [...this.entries.values()];
  }

  /** Grouped, cheat-sheet-ready view: only active scopes, hidden entries excluded, stable group order. */
  visible(): ShortcutDef[] {
    return this.list().filter((d) => !d.hidden && this.isScopeActive(d.when));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  /**
   * Dispatches a real (or test-constructed) keyboard event. Returns true if
   * a handler ran, so callers can `preventDefault`.
   */
  dispatch(combo: string, event: KeyboardEvent): boolean {
    const typing = isTypingTarget(event.target);
    let ran = false;
    for (const def of this.entries.values()) {
      if (def.keys !== combo) continue;
      if (!this.isScopeActive(def.when)) continue;
      if (typing && isUnmodifiedCombo(combo) && !def.allowWhileTyping) continue;
      def.handler(event);
      ran = true;
    }
    return ran;
  }
}

export const shortcutRegistry = new ShortcutRegistry();

export const GROUP_ORDER = ['Global', 'Navigation', 'Actions', 'Player', 'Build'];

/** Sorts groups by the app's canonical order, unknown groups sorted after by name. */
export function sortGroups(groups: string[]): string[] {
  return [...groups].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
