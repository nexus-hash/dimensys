#!/usr/bin/env node

/**
 * check-contrast.mjs — WCAG contrast guardrail for the design-token system (DS2).
 *
 * Computes real WCAG 2.2 contrast ratios for the key token pairs called out
 * in UI_UX_SPEC.md §3/§9, in both themes, and fails the build if any pair
 * violates its threshold:
 *
 *   - ink-primary / ink-secondary on surface-page / surface-raised /
 *     surface-canvas — normal text, WCAG AA minimum 4.5:1 (§9).
 *   - ink-muted on the same three surfaces — caption/metadata-tier text
 *     (§3.2 "caption: metadata, axis labels"), checked at the WCAG
 *     "UI graphics / large text" minimum of 3:1.
 *   - signal-warn / signal-critical on the dark and light surface-page —
 *     UI graphics, WCAG minimum 3:1 (§9).
 *
 * The token values below MUST be kept in sync with app/globals.css by hand
 * (this is plain Node with no CSS parser, per the DS2 task constraints).
 *
 * Usage: node scripts/check-contrast.mjs   (npm run lint:contrast)
 */

// ── Token values (mirror app/globals.css) ────────────────────────────────────
const TOKENS = {
  light: {
    'surface-page': '#ffffff',
    'surface-raised': '#fafafa',
    'surface-canvas': '#fcfcfb',
    'ink-primary': '#121212',
    'ink-secondary': 'rgba(18, 18, 18, 0.64)',
    'ink-muted': 'rgba(18, 18, 18, 0.48)',
  },
  dark: {
    'surface-page': '#121212',
    'surface-raised': '#1a1a1a',
    'surface-canvas': '#101010',
    'ink-primary': '#f0f0f0',
    'ink-secondary': 'rgba(240, 240, 240, 0.64)',
    'ink-muted': 'rgba(240, 240, 240, 0.44)',
  },
};

const SIGNAL = {
  light: { 'signal-warn': '#b45309', 'signal-critical': '#e11d48' },
  dark: { 'signal-warn': '#fab219', 'signal-critical': '#e11d48' },
};

const TEXT_MIN = 4.5; // WCAG AA, normal text (§9)
const GRAPHIC_MIN = 3.0; // WCAG AA, UI graphics / large text (§9)

// ── Color parsing ─────────────────────────────────────────────────────────────
function parseColor(input) {
  const str = input.trim();

  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbaMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return { r: Number(r), g: Number(g), b: Number(b), a: a !== undefined ? Number(a) : 1 };
  }

  throw new Error(`Unrecognized color: ${input}`);
}

// Alpha-composite `fg` (with alpha) over an opaque `bg`.
function compositeOver(fg, bg) {
  const a = fg.a ?? 1;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

function srgbChannelToLinear(c8bit) {
  const c = c8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(rgbA, rgbB) {
  const L1 = relativeLuminance(rgbA);
  const L2 = relativeLuminance(rgbB);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkPair(theme, fgName, fgValue, bgName, bgValue, min, purpose) {
  const bg = parseColor(bgValue); // assumed opaque
  const fg = parseColor(fgValue);
  const rendered = compositeOver(fg, bg);
  const ratio = contrastRatio(rendered, bg);
  return {
    theme,
    fgName,
    bgName,
    ratio,
    min,
    purpose,
    pass: ratio + 1e-9 >= min,
  };
}

function main() {
  const results = [];

  // ink-primary / ink-secondary / ink-muted on page / raised / canvas, both themes
  for (const theme of ['light', 'dark']) {
    const t = TOKENS[theme];
    const surfaces = ['surface-page', 'surface-raised', 'surface-canvas'];
    const inks = [
      ['ink-primary', TEXT_MIN, 'text'],
      ['ink-secondary', TEXT_MIN, 'text'],
      ['ink-muted', GRAPHIC_MIN, 'caption/metadata text'],
    ];
    for (const surface of surfaces) {
      for (const [inkName, min, purpose] of inks) {
        results.push(checkPair(theme, inkName, t[inkName], surface, t[surface], min, purpose));
      }
    }
  }

  // signal-warn / signal-critical on their theme's surface-page, as UI graphics
  for (const theme of ['light', 'dark']) {
    const bgValue = TOKENS[theme]['surface-page'];
    for (const signalName of ['signal-warn', 'signal-critical']) {
      results.push(
        checkPair(theme, signalName, SIGNAL[theme][signalName], 'surface-page', bgValue, GRAPHIC_MIN, 'UI graphic')
      );
    }
  }

  const failures = results.filter((r) => !r.pass);

  for (const r of results) {
    const status = r.pass ? '✓' : '✗';
    console.log(
      `${status} [${r.theme}] ${r.fgName} on ${r.bgName} — ${r.ratio.toFixed(2)}:1 (need ≥${r.min}:1, ${r.purpose})`
    );
  }

  if (failures.length === 0) {
    console.log(`\n✓ lint:contrast — all ${results.length} token pairs meet their WCAG floor.`);
    process.exit(0);
  }

  console.error(`\n✗ lint:contrast — ${failures.length} of ${results.length} pairs fail their WCAG floor.`);
  process.exit(1);
}

main();
