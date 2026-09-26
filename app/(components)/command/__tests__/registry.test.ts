import { describe, it, expect, vi, afterEach } from 'vitest';
import { shortcutRegistry } from '../registry';
import { isTypingTarget, isUnmodifiedCombo, comboFromEvent } from '../keys';

function makeEvent(overrides: Partial<KeyboardEvent> & { key: string; target?: EventTarget }): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: () => {},
    ...overrides,
    target: overrides.target ?? document.body,
  } as unknown as KeyboardEvent;
}

describe('shortcutRegistry', () => {
  afterEach(() => {
    // Clean up anything a test forgot to unregister so tests stay isolated.
    for (const def of shortcutRegistry.list()) shortcutRegistry.unregister(def.id);
  });

  it('registers and unregisters, and dispatch only reaches registered handlers', () => {
    const handler = vi.fn();
    const unregister = shortcutRegistry.register({ id: 'a', keys: 'mod+k', label: 'A', group: 'Test', handler });

    expect(shortcutRegistry.dispatch('mod+k', makeEvent({ key: 'k', metaKey: true }))).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    unregister();
    expect(shortcutRegistry.dispatch('mod+k', makeEvent({ key: 'k', metaKey: true }))).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('warns in dev on a same-scope key conflict, and does not warn across scopes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    shortcutRegistry.register({ id: 'k1', keys: 'k', label: 'Kill', group: 'Player', handler: vi.fn() });
    shortcutRegistry.register({ id: 'k2', keys: 'k', label: 'Also K', group: 'Player', handler: vi.fn() });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('k1');

    warn.mockClear();
    shortcutRegistry.register({ id: 'k3', keys: 'k', label: 'Scoped K', group: 'Demo', when: 'demo-scope', handler: vi.fn() });
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it('only dispatches a scoped shortcut while its scope is active', () => {
    const handler = vi.fn();
    shortcutRegistry.register({ id: 'scoped', keys: 'd', label: 'Demo', group: 'Demo', when: 'demo-scope', handler });

    expect(shortcutRegistry.dispatch('d', makeEvent({ key: 'd' }))).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    shortcutRegistry.pushScope('demo-scope');
    expect(shortcutRegistry.dispatch('d', makeEvent({ key: 'd' }))).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    shortcutRegistry.popScope('demo-scope');
    expect(shortcutRegistry.dispatch('d', makeEvent({ key: 'd' }))).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports nested push/pop of the same scope (reference counted)', () => {
    shortcutRegistry.pushScope('nested');
    shortcutRegistry.pushScope('nested');
    shortcutRegistry.popScope('nested');
    expect(shortcutRegistry.isScopeActive('nested')).toBe(true);
    shortcutRegistry.popScope('nested');
    expect(shortcutRegistry.isScopeActive('nested')).toBe(false);
  });

  it('ignores an unmodified single-key shortcut while the target is a text field', () => {
    const handler = vi.fn();
    shortcutRegistry.register({ id: 'single', keys: 'k', label: 'Kill', group: 'Player', handler });

    const input = document.createElement('input');
    expect(shortcutRegistry.dispatch('k', makeEvent({ key: 'k', target: input }))).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    expect(shortcutRegistry.dispatch('k', makeEvent({ key: 'k', target: document.body }))).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('still dispatches a mod+ combo while typing (only bare keys are guarded)', () => {
    const handler = vi.fn();
    shortcutRegistry.register({ id: 'palette', keys: 'mod+k', label: 'Palette', group: 'Global', handler });

    const input = document.createElement('input');
    expect(shortcutRegistry.dispatch('mod+k', makeEvent({ key: 'k', metaKey: true, target: input }))).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('respects allowWhileTyping to opt a bare key back in', () => {
    const handler = vi.fn();
    shortcutRegistry.register({
      id: 'escape-like',
      keys: 'k',
      label: 'Fires even while typing',
      group: 'Test',
      allowWhileTyping: true,
      handler,
    });
    const input = document.createElement('input');
    expect(shortcutRegistry.dispatch('k', makeEvent({ key: 'k', target: input }))).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('typing-guard helpers', () => {
  it('isTypingTarget recognizes inputs, textareas, selects and contenteditable', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(document.createElement('select'))).toBe(true);
    expect(isTypingTarget(document.createElement('div'))).toBe(false);

    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isTypingTarget(editable)).toBe(true);
  });

  it('isUnmodifiedCombo is false for mod/alt combos and true for bare keys or shift+letter', () => {
    expect(isUnmodifiedCombo('k')).toBe(true);
    expect(isUnmodifiedCombo('?')).toBe(true);
    expect(isUnmodifiedCombo('shift+z')).toBe(true);
    expect(isUnmodifiedCombo('mod+k')).toBe(false);
    expect(isUnmodifiedCombo('alt+k')).toBe(false);
  });

  it('comboFromEvent normalizes mod, shift+letter and punctuation consistently', () => {
    expect(comboFromEvent(makeEvent({ key: 'k', metaKey: true }))).toBe('mod+k');
    expect(comboFromEvent(makeEvent({ key: 'k', ctrlKey: true }))).toBe('mod+k');
    expect(comboFromEvent(makeEvent({ key: 'z', metaKey: true, shiftKey: true }))).toBe('mod+shift+z');
    expect(comboFromEvent(makeEvent({ key: '?', shiftKey: true }))).toBe('?');
    expect(comboFromEvent(makeEvent({ key: 'K', metaKey: true }))).toBe('mod+k');
  });
});
