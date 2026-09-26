import { describe, it, expect, vi, afterEach } from 'vitest';
import { runViewTransition, supportsViewTransitions } from '../viewTransition';

afterEach(() => {
  // @ts-expect-error — test-only cleanup of a property we may have added.
  delete document.startViewTransition;
});

describe('supportsViewTransitions', () => {
  it('is false in jsdom (no platform API)', () => {
    expect(supportsViewTransitions()).toBe(false);
  });

  it('is true once the platform API is present', () => {
    // @ts-expect-error — stubbing the platform API for the test.
    document.startViewTransition = () => ({
      ready: Promise.resolve(),
      finished: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      skipTransition: () => {},
    });
    expect(supportsViewTransitions()).toBe(true);
  });
});

describe('runViewTransition', () => {
  it('falls back to an instant, synchronous-ish update when unsupported', async () => {
    let ran = false;
    await runViewTransition(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it('runs the update directly when reduced motion is forced, even if the platform API exists', async () => {
    const startViewTransition = vi.fn();
    Object.assign(document, { startViewTransition });

    let ran = false;
    await runViewTransition(
      () => {
        ran = true;
      },
      { reduced: true },
    );

    expect(ran).toBe(true);
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it('uses the platform API when available and motion is not reduced', async () => {
    let ran = false;
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: () => {},
      };
    });
    // @ts-expect-error — stubbing the platform API for the test.
    document.startViewTransition = startViewTransition;

    await runViewTransition(
      () => {
        ran = true;
      },
      { reduced: false },
    );

    expect(ran).toBe(true);
    expect(startViewTransition).toHaveBeenCalledTimes(1);
  });
});
