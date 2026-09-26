import { describe, it, expect } from 'vitest';
import { MOTION_PRESETS, getPreset, resolveMs, presetTotalMs, effectiveDurationMs } from '../presets';
import { durationMs } from '../tokens';

describe('MOTION_PRESETS', () => {
  it('has one preset per signature moment, each with a unique id', () => {
    expect(MOTION_PRESETS.length).toBeGreaterThan(0);
    const ids = MOTION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset declares a reduced-motion variant', () => {
    for (const preset of MOTION_PRESETS) {
      expect(preset.reduced).toBeTruthy();
      expect(['fade', 'steady', 'instant']).toContain(preset.reduced.mode);
      expect(preset.reduced.description.length).toBeGreaterThan(0);
    }
  });

  it('every stage resolves to a non-negative duration derived from a token', () => {
    for (const preset of MOTION_PRESETS) {
      for (const stage of preset.stages) {
        expect(resolveMs(stage.duration)).toBeGreaterThanOrEqual(0);
        if (stage.delay) expect(resolveMs(stage.delay)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('getPreset looks up by id, and returns undefined for an unknown one', () => {
    expect(getPreset('kill')?.moment).toContain('killed');
    expect(getPreset('does-not-exist')).toBeUndefined();
  });
});

describe('resolveMs', () => {
  it('resolves a bare token to its ms value', () => {
    expect(resolveMs('micro')).toBe(durationMs('micro'));
  });

  it('resolves a fraction-of-token value', () => {
    expect(resolveMs({ fractionOf: 'small', factor: 0.5 })).toBe(Math.round(durationMs('small') * 0.5));
  });
});

describe('effectiveDurationMs — reduced variant selection', () => {
  it('full motion uses the preset total stage duration', () => {
    const preset = getPreset('kill')!;
    expect(effectiveDurationMs(preset, false)).toBe(presetTotalMs(preset));
    expect(effectiveDurationMs(preset, false)).toBeGreaterThan(0);
  });

  it('a "fade" reduced preset uses its short reduced duration, not the full choreography length', () => {
    const preset = getPreset('kill')!;
    expect(preset.reduced.mode).toBe('fade');
    const reducedMs = effectiveDurationMs(preset, true);
    expect(reducedMs).toBe(durationMs(preset.reduced.duration ?? 'micro'));
    expect(reducedMs).toBeLessThan(effectiveDurationMs(preset, false));
  });

  it('an "instant" reduced preset resolves to 0ms', () => {
    const preset = getPreset('theme-switch')!;
    expect(preset.reduced.mode).toBe('instant');
    expect(effectiveDurationMs(preset, true)).toBe(0);
  });

  it('a "steady" reduced preset resolves to 0ms (no ongoing animation)', () => {
    const preset = getPreset('requests-failing')!;
    expect(preset.reduced.mode).toBe('steady');
    expect(effectiveDurationMs(preset, true)).toBe(0);
  });
});
