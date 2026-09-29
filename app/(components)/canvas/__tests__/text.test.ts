/**
 * Pins the node text metrics and sub-label rule. The diagram build sizes
 * every node box with its own copy of these exact numbers (and pins them
 * back in its own test); if the two ever drift, a title the box was sized
 * for would truncate once drawn.
 */
import { describe, expect, it } from 'vitest';
import {
  MONO_CHAR_EM,
  measureMono,
  measureSans,
  nodeSubLabel,
  SANS_ADVANCE_PER_MILLE,
  SANS_FALLBACK_EM,
  SUB_FONT_PX,
  TEXT_PAD_R,
  TEXT_SAFETY_PX,
  TEXT_SAFETY_SCALE,
  TEXT_X,
  TITLE_FONT_PX,
  TITLE_PAD_R,
  truncateToFit,
  withSafety,
} from '../text';

describe('canvas text metrics', () => {
  it('pins the constants shared with the diagram build', () => {
    expect({ TEXT_X, TEXT_PAD_R, TITLE_PAD_R, TITLE_FONT_PX, SUB_FONT_PX }).toEqual({
      TEXT_X: 38,
      TEXT_PAD_R: 12,
      TITLE_PAD_R: 26,
      TITLE_FONT_PX: 13,
      SUB_FONT_PX: 12,
    });
    expect({ MONO_CHAR_EM, SANS_FALLBACK_EM, TEXT_SAFETY_SCALE, TEXT_SAFETY_PX }).toEqual({
      MONO_CHAR_EM: 0.6,
      SANS_FALLBACK_EM: 0.72,
      TEXT_SAFETY_SCALE: 1.04,
      TEXT_SAFETY_PX: 2,
    });
    expect(SANS_ADVANCE_PER_MILLE).toHaveLength(95);
    expect(SANS_ADVANCE_PER_MILLE.reduce((a, b) => a + b, 0)).toBe(51926);
  });

  it('measures proportional and mono text', () => {
    expect(measureSans('Load Balancer', 13)).toBeCloseTo(88.543, 3);
    expect(measureMono('api · ×6', 12)).toBeCloseTo(57.6, 6);
    expect(measureSans('é', 10)).toBeCloseTo(7.2, 6); // outside the table: fallback advance
  });

  it('fits text that the layout sized a box for, and ellipsizes past it', () => {
    const measure = (t: string) => measureSans(t, 13);
    // 144 − 38 − 26 = 80px title room on the narrowest card.
    expect(truncateToFit('API Service', 80, measure)).toBe('API Service');
    const cut = truncateToFit('Key Generation Service', 80, measure);
    expect(cut.endsWith('…')).toBe(true);
    expect(withSafety(measure(cut))).toBeLessThanOrEqual(80);
  });

  it('builds the sub-label as `<kind> · <detail>[ ×N]`, a server\'s variant as its kind', () => {
    expect(nodeSubLabel('lb', 'nginx', 2)).toBe('lb · nginx ×2');
    expect(nodeSubLabel('server', 'api', 6)).toBe('api · ×6');
    expect(nodeSubLabel('cache', 'redis', undefined)).toBe('cache · redis');
    expect(nodeSubLabel('messageBus', 'kafka', 1)).toBe('bus · kafka');
    expect(nodeSubLabel('worker', undefined, 12)).toBe('worker · ×12');
    expect(nodeSubLabel('client', 'web', undefined)).toBe('client · web');
    expect(nodeSubLabel('server', undefined, 3)).toBe('server · ×3');
    expect(nodeSubLabel('apiGateway', undefined, undefined)).toBe('gateway');
  });
});
