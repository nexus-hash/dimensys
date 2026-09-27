import { describe, it, expect } from 'vitest';
import { classifyHealth, meterSeverity, healthChipText, healthGlyphMarkup } from '../health';

describe('classifyHealth', () => {
  it('is ok for a healthy token with no prior state', () => {
    expect(classifyHealth(undefined, 'ok', 1)) .toBe('ok');
  });

  it('passes warn/critical tokens straight through', () => {
    expect(classifyHealth(undefined, 'warn', 1)).toBe('warn');
    expect(classifyHealth('warn', 'critical', 1)).toBe('critical');
  });

  it('collapses decoration-only tokens (info/accent/muted) to ok', () => {
    expect(classifyHealth(undefined, 'info', 1)).toBe('ok');
    expect(classifyHealth(undefined, 'accent', 1)).toBe('ok');
    expect(classifyHealth(undefined, 'muted', 1)).toBe('ok');
  });

  it('is down whenever the up metric is exactly 0, regardless of the token', () => {
    expect(classifyHealth('ok', 'ok', 0)).toBe('down');
    expect(classifyHealth('critical', 'critical', 0)).toBe('down');
  });

  it('treats a missing up metric as up (no down without evidence)', () => {
    expect(classifyHealth(undefined, 'ok', undefined)).toBe('ok');
  });

  it('reports recovering on a critical -> ok transition, then settles to ok', () => {
    const afterCritical = classifyHealth('critical', 'ok', 1);
    expect(afterCritical).toBe('recovering');
    const settled = classifyHealth(afterCritical, 'ok', 1);
    expect(settled).toBe('ok');
  });

  it('reports warn (not recovering) on a critical -> warn transition', () => {
    expect(classifyHealth('critical', 'warn', 1)).toBe('warn');
  });

  it('a recovering node that gets worse again reports that worse state directly', () => {
    expect(classifyHealth('recovering', 'critical', 1)).toBe('critical');
  });
});

describe('meterSeverity', () => {
  it('thresholds at 0.7 (warn) and 0.9 (critical)', () => {
    expect(meterSeverity(0.5)).toBe('ok');
    expect(meterSeverity(0.7)).toBe('warn');
    expect(meterSeverity(0.89)).toBe('warn');
    expect(meterSeverity(0.9)).toBe('critical');
    expect(meterSeverity(1)).toBe('critical');
  });
});

describe('healthChipText', () => {
  it('is undefined for a healthy state or a missing value', () => {
    expect(healthChipText('ok', 'p99 latency', 640, 'ms')).toBeUndefined();
    expect(healthChipText('warn', 'p99 latency', undefined, 'ms')).toBeUndefined();
  });

  it('formats a labeled metric with its unit', () => {
    expect(healthChipText('warn', 'p99 latency', 640, 'ms')).toBe('p99 latency 640 ms');
  });

  it('omits the unit for a ratio', () => {
    expect(healthChipText('critical', 'error rate', 0.4321, 'ratio')).toBe('error rate 0.43');
  });
});

describe('healthGlyphMarkup', () => {
  it('returns non-empty SVG markup for every non-ok state', () => {
    for (const state of ['warn', 'critical', 'down', 'recovering'] as const) {
      expect(healthGlyphMarkup(state).length).toBeGreaterThan(0);
    }
  });
});
