import { describe, it, expect } from 'vitest';
import { animateSpring, criticalDamping, springPreset } from '../spring';

function waitForSettle(run: (onDone: () => void) => { cancel: () => void }): Promise<void> {
  return new Promise((resolve) => {
    run(resolve);
  });
}

describe('animateSpring', () => {
  it('settles at the target value', async () => {
    let last = -1;
    await waitForSettle((onDone) => {
      const handle = animateSpring({
        from: 0,
        to: 100,
        config: { stiffness: 400, damping: 32 },
        onUpdate: (v) => {
          last = v;
        },
        onSettle: onDone,
      });
      return handle;
    });
    expect(last).toBeCloseTo(100, 1);
  });

  it('resolves immediately (next frame) when from === to', async () => {
    let updateCount = 0;
    let settled = false;
    await new Promise<void>((resolve) => {
      animateSpring({
        from: 5,
        to: 5,
        config: { stiffness: 170, damping: 26 },
        onUpdate: () => {
          updateCount += 1;
        },
        onSettle: () => {
          settled = true;
          resolve();
        },
      });
    });
    expect(settled).toBe(true);
    expect(updateCount).toBe(1);
  });

  it('can be cancelled — onSettle never fires and updates stop', async () => {
    let updates = 0;
    let settled = false;
    const handle = animateSpring({
      from: 0,
      to: 1000,
      config: { stiffness: 20, damping: 2 }, // slow, underdamped — won't settle quickly
      onUpdate: () => {
        updates += 1;
      },
      onSettle: () => {
        settled = true;
      },
    });

    // Let a couple of frames run, then cancel.
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    const updatesAtCancel = updates;
    handle.cancel();
    expect(handle.running).toBe(false);

    // Give it time it would have needed to keep animating/settle.
    await new Promise((r) => setTimeout(r, 50));

    expect(settled).toBe(false);
    expect(updates).toBe(updatesAtCancel);
  });

  it('a critically-damped spring does not overshoot the target', async () => {
    const stiffness = 300;
    const damping = criticalDamping(stiffness);
    let maxValue = -Infinity;
    await waitForSettle((onDone) =>
      animateSpring({
        from: 0,
        to: 1,
        config: { stiffness, damping },
        onUpdate: (v) => {
          maxValue = Math.max(maxValue, v);
        },
        onSettle: onDone,
      }),
    );
    expect(maxValue).toBeLessThanOrEqual(1.01);
  });
});

describe('springPreset', () => {
  it('falls back to the documented camera/ui values outside a browser (jsdom exposes getComputedStyle, so this checks the shape)', () => {
    const camera = springPreset('camera');
    const ui = springPreset('ui');
    expect(camera.stiffness).toBeGreaterThan(0);
    expect(camera.damping).toBeGreaterThan(0);
    expect(ui.stiffness).toBeGreaterThan(0);
    expect(ui.damping).toBeGreaterThan(0);
  });

  it('applies overrides on top of the preset', () => {
    const config = springPreset('ui', { mass: 2 });
    expect(config.mass).toBe(2);
  });
});
