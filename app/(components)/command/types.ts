/**
 * A registered shortcut. `keys` is a normalized combo string produced by
 * `comboFromEvent` (e.g. `"mod+k"`, `"k"`, `"?"`, `"mod+shift+z"`) — never a
 * raw `KeyboardEvent.key`. `when` scopes the binding: `undefined` (or
 * `"global"`) means always active; anything else is only live while that
 * scope has been pushed active (see `useShortcutScope`).
 */
export interface ShortcutDef {
  id: string;
  keys: string;
  label: string;
  group: string;
  handler: (event: KeyboardEvent) => void;
  when?: string;
  /**
   * Single-key bindings (no `mod`/`alt` modifier) are ignored while the
   * user is typing in a text field. Set this to keep firing anyway
   * (used for nothing in this module today, but kept for callers that
   * need it — e.g. a binding that itself only fires from inside a field).
   */
  allowWhileTyping?: boolean;
  /** Hidden from the `?` cheat sheet and the registry gallery, but still dispatches. */
  hidden?: boolean;
}

export type ShortcutRegistration = Omit<ShortcutDef, 'id' | 'handler'> & {
  id?: string;
};

export const GLOBAL_SCOPE = 'global';

/** A navigable catalog/page entry, passed in from a server component. */
export interface PaletteNavItem {
  id: string;
  title: string;
  kind: string;
  href: string;
  tags?: string[];
}
