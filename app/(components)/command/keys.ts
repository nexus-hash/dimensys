/**
 * Cross-platform key-combo normalization: turns a `KeyboardEvent` into a
 * stable string (`"mod+k"`, `"?"`, `"mod+shift+z"`, `"arrowup"`) that's the
 * same on macOS (⌘) and everywhere else (Ctrl), so the registry never has
 * to special-case a platform. `mod` always means "the platform's primary
 * modifier" (metaKey on macOS, ctrlKey elsewhere) — callers write shortcuts
 * once as `mod+k` and get both.
 */

const ARROW_LABELS: Record<string, string> = {
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
};

const KEY_LABELS: Record<string, string> = {
  ...ARROW_LABELS,
  escape: 'Esc',
  enter: 'Enter',
  tab: 'Tab',
  space: 'Space',
  delete: 'Delete',
  backspace: '⌫',
};

function normalizeKeyToken(key: string): string {
  if (key === ' ') return 'space';
  if (/^[a-zA-Z]$/.test(key)) return key.toLowerCase();
  return key.length > 1 ? key.toLowerCase() : key;
}

/** Builds the normalized combo string for a live `KeyboardEvent`. */
export function comboFromEvent(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): string {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.altKey) parts.push('alt');
  const token = normalizeKeyToken(event.key);
  // Shift only gets its own token for letters (mod+shift+z). Punctuation
  // produced by shift (e.g. "?") already carries the shift in `event.key`.
  if (event.shiftKey && /^[a-z]$/.test(token)) parts.push('shift');
  parts.push(token);
  return parts.join('+');
}

/** True if the combo has no `mod`/`alt` modifier (a bare key, or shift+letter). */
export function isUnmodifiedCombo(combo: string): boolean {
  const parts = combo.split('+');
  return !parts.includes('mod') && !parts.includes('alt');
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

/** True when the event's target is a text field / contenteditable. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return isEditableElement(target as Element | null);
}

/** Splits a combo into the tokens the cheat sheet / hints render as `<Kbd>` chips. */
export function comboToTokens(combo: string, modLabel: string): string[] {
  return combo.split('+').map((part) => {
    if (part === 'mod') return modLabel;
    if (part === 'shift') return '⇧';
    if (part === 'alt') return '⌥';
    const lower = part.toLowerCase();
    if (KEY_LABELS[lower]) return KEY_LABELS[lower];
    return part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1);
  });
}

/** `"⌘"` on macOS, `"Ctrl"` everywhere else — read from the UA string. */
export function detectModLabel(userAgent: string | undefined): string {
  return userAgent?.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
}
