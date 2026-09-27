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
  it('is undefined for a healthy state', () => {
    expect(healthChipText('ok', { p99: 640 })).toBeUndefined();
  });

  it('names the metric that crossed a threshold, not the first one published', () => {
    // Warm-up case: utilization under its warn line, p99 over it.
    expect(healthChipText('warn', { util: 0.66, p99: 835 })).toBe('p99 835 ms');
  });

  it('picks the worst severity, then the one closest to its critical limit', () => {
    expect(healthChipText('critical', { util: 0.95, err: 0.02, p99: 600 })).toBe('util 95%');
    expect(healthChipText('warn', { util: 0.75, p99: 1900 })).toBe('p99 1,900 ms');
    expect(healthChipText('critical', { err: 0.38 })).toBe('err 38%');
  });

  it('shows no chip when nothing crosses a display threshold', () => {
    expect(healthChipText('warn', { util: 0.66, p99: 400 })).toBeUndefined();
  });

  it('reads DOWN for a down node', () => {
    expect(healthChipText('down', {})).toBe('DOWN');
  });
});

describe('healthGlyphMarkup', () => {
  it('returns non-empty SVG markup for every non-ok state', () => {
    for (const state of ['warn', 'critical', 'down', 'recovering'] as const) {
      expect(healthGlyphMarkup(state).length).toBeGreaterThan(0);
    }
  });
});
