import { describe, it, expect } from 'vitest';
import {
  particleSpawnHz,
  particleTravelMs,
  pickParticleKind,
  pointOnSamples,
  SAMPLE_SPACING,
  samplePath,
  progressForPileup,
  PILEUP_FRACTION,
  ParticlePool,
  MAX_PARTICLES,
} from '../particleMath';

describe('particleSpawnHz', () => {
  it('is zero with no traffic', () => {
    expect(particleSpawnHz(0)).toBe(0);
    expect(particleSpawnHz(-1)).toBe(0);
  });

  it('increases monotonically with rps', () => {
    const low = particleSpawnHz(1);
    const mid = particleSpawnHz(10);
    const high = particleSpawnHz(40);
    expect(low).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('saturates at and beyond the saturating rps', () => {
    expect(particleSpawnHz(40)).toBeCloseTo(particleSpawnHz(400), 5);
  });
});

describe('particleTravelMs', () => {
  it('is clamped to a sane minimum for near-zero latency', () => {
    expect(particleTravelMs(0)).toBeGreaterThan(0);
    expect(particleTravelMs(1)).toBeGreaterThanOrEqual(particleTravelMs(0));
  });

  it('increases with latency (slower particles for slower links)', () => {
    expect(particleTravelMs(500)).toBeGreaterThan(particleTravelMs(50));
  });

  it('is capped so an extreme latency does not freeze the particle forever', () => {
    expect(particleTravelMs(1_000_000)).toBe(particleTravelMs(100_000));
  });
});

describe('pickParticleKind', () => {
  it('picks error within the error band', () => {
    expect(pickParticleKind(0, 0.3, 0.2)).toBe('error');
    expect(pickParticleKind(0.29, 0.3, 0.2)).toBe('error');
  });

  it('picks retry within the retry band, after error', () => {
    expect(pickParticleKind(0.3, 0.3, 0.2)).toBe('retry');
    expect(pickParticleKind(0.49, 0.3, 0.2)).toBe('retry');
  });

  it('picks ok past both bands', () => {
    expect(pickParticleKind(0.5, 0.3, 0.2)).toBe('ok');
    expect(pickParticleKind(1, 0, 0)).toBe('ok');
  });
});

describe('progressForPileup', () => {
  it('never exceeds the pileup fraction', () => {
    expect(progressForPileup(1, 1, 5)).toBeLessThanOrEqual(PILEUP_FRACTION);
    expect(progressForPileup(1, 5, 5)).toBeLessThanOrEqual(PILEUP_FRACTION);
  });

  it('spaces a later arrival behind an earlier one in the same queue', () => {
    const first = progressForPileup(1, 1, 10);
    const later = progressForPileup(1, 8, 10);
    expect(later).toBeLessThan(first);
  });

  it('never produces a negative progress', () => {
    expect(progressForPileup(1, 1000, 1000)).toBeGreaterThanOrEqual(0);
  });
});

describe('ParticlePool', () => {
  it('starts empty', () => {
    const pool = new ParticlePool(8);
    expect(pool.active).toBe(0);
  });

  it('spawns into a free slot and reports it as active', () => {
    const pool = new ParticlePool(4);
    pool.spawn(0, 0, 500, false);
    expect(pool.active).toBe(1);
    let seen = 0;
    pool.forEachActive((_slot, linkIdx) => {
      seen++;
      expect(linkIdx).toBe(0);
    });
    expect(seen).toBe(1);
  });

  it('drops a spawn once every slot is full (no growth, no throw)', () => {
    const pool = new ParticlePool(2);
    pool.spawn(0, 0, 1000, false);
    pool.spawn(0, 0, 1000, false);
    pool.spawn(0, 0, 1000, false); // dropped
    expect(pool.active).toBe(2);
  });

  it('advances progress on step and frees the slot once it completes', () => {
    const pool = new ParticlePool(4);
    pool.spawn(0, 0, 100, false);
    pool.step(50);
    let progress = -1;
    pool.forEachActive((_s, _l, p) => {
      progress = p;
    });
    expect(progress).toBeCloseTo(0.5, 5);

    pool.step(60); // crosses 1.0
    expect(pool.active).toBe(0);
  });

  it('never advances a piling particle (it stays frozen at the cut)', () => {
    const pool = new ParticlePool(4);
    pool.spawn(0, 0, 100, true);
    pool.step(1000);
    expect(pool.active).toBe(1);
  });

  it('clearLink frees every particle on that link only', () => {
    const pool = new ParticlePool(4);
    pool.spawn(0, 0, 1000, false);
    pool.spawn(1, 0, 1000, false);
    pool.clearLink(0);
    expect(pool.active).toBe(1);
    pool.forEachActive((_s, linkIdx) => expect(linkIdx).toBe(1));
  });

  it('the module cap is a sane, positive number', () => {
    expect(MAX_PARTICLES).toBeGreaterThan(0);
  });

  it('step does no per-call allocation of new arrays (same typed-array identity across steps)', () => {
    const pool = new ParticlePool(4);
    const before = pool.progress;
    pool.spawn(0, 0, 1000, false);
    pool.step(16);
    expect(pool.progress).toBe(before);
  });
});

describe('samplePath / pointOnSamples (particles ride the drawn path)', () => {
  // A quarter circle of radius 100: every sampled point lies on it, and
  // interpolating between samples stays within a fraction of a pixel.
  const R = 100;
  const length = (Math.PI / 2) * R;
  const pointAt = (len: number) => ({ x: R * Math.cos(len / R), y: R * Math.sin(len / R) });

  it('samples at most SAMPLE_SPACING apart, ends included', () => {
    const s = samplePath(pointAt, length);
    const n = s.length / 2 - 1;
    expect(length / n).toBeLessThanOrEqual(SAMPLE_SPACING);
    expect([s[0], s[1]]).toEqual([100, 0]);
    expect(s[n * 2]).toBeCloseTo(0, 4);
    expect(s[n * 2 + 1]).toBeCloseTo(100, 4);
  });

  it('interpolated points stay within 0.1px of the true curve', () => {
    const s = samplePath(pointAt, length);
    const out = { x: 0, y: 0 };
    for (let t = 0; t <= 1; t += 0.013) {
      const p = pointOnSamples(s, t, out);
      expect(Math.abs(Math.hypot(p.x, p.y) - R)).toBeLessThan(0.1);
    }
  });
});
