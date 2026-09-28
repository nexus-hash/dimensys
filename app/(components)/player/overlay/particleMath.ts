/**
 * Pure particle-rate math (T3.3): how many particles a link's live rps
 * should spawn per second, how long one takes to cross the link (speed
 * follows latency), and which of the three kinds — a successful request,
 * a hollow retry ring, or a filled error dot — the next spawn should be.
 * No DOM, no canvas, no allocation: `ParticlePool` below is the only
 * stateful piece, and it reuses its own backing arrays every step.
 */

/** Never more than this many live particles across the whole diagram, regardless of how busy it gets. */
export const MAX_PARTICLES = 400;

/** Never fewer than this many spawns/sec once a link has any traffic at all, so a slow trickle still reads as "flowing". */
const MIN_SPAWN_HZ = 0.8;
/** Cap so a very hot link doesn't spawn faster than the canvas can usefully draw distinct dots. */
const MAX_SPAWN_HZ = 14;
/** rps at/above which spawn rate is saturated at `MAX_SPAWN_HZ`. */
const SATURATING_RPS = 40;

/** Spawns/sec for a link carrying `rps` requests/sec. `0` for no traffic (nothing spawns). */
export function particleSpawnHz(rps: number): number {
  if (!(rps > 0)) return 0;
  const t = Math.min(1, rps / SATURATING_RPS);
  return MIN_SPAWN_HZ + t * (MAX_SPAWN_HZ - MIN_SPAWN_HZ);
}

const MIN_TRAVEL_MS = 220;
const MAX_TRAVEL_MS = 2600;

/** How long (ms) one particle takes to cross its link, from that link's mean/p99 latency — higher latency reads as visibly slower. */
export function particleTravelMs(latencyMs: number): number {
  if (!(latencyMs > 0)) return MIN_TRAVEL_MS;
  return Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, latencyMs * 6));
}

export type ParticleKind = 'ok' | 'retry' | 'error';

/**
 * Picks the next spawn's kind from a link's live retry/error ratios
 * (`retryRps/rps`, `errorRps/rps`), using `rand` (0..1) so it's testable
 * without real randomness. Error wins ties over retry (a request that both
 * retried and ultimately failed reads as the failure).
 */
export function pickParticleKind(rand: number, errorRatio: number, retryRatio: number): ParticleKind {
  const err = Math.max(0, Math.min(1, errorRatio));
  const retry = Math.max(0, Math.min(1, retryRatio));
  if (rand < err) return 'error';
  if (rand < err + retry) return 'retry';
  return 'ok';
}

/**
 * A partitioned/cut link never lets a particle reach the far end: it piles
 * up around this fraction of the route instead (the design spec's "piling up
 * at a partitioned cut"). `progressForPileup` eases a particle's approach so
 * later arrivals visibly queue up just behind earlier ones rather than
 * overlapping exactly.
 */
export const PILEUP_FRACTION = 0.45;

export function progressForPileup(rawT: number, queueIndex: number, queueSize: number): number {
  const spread = Math.min(0.12, 0.02 * queueSize);
  const target = PILEUP_FRACTION - (queueIndex / Math.max(1, queueSize)) * spread;
  return Math.min(rawT, Math.max(0, target));
}

/** One pool slot's fields, kept as parallel typed arrays (no per-particle object). */
export class ParticlePool {
  readonly capacity: number;
  /** Index into the caller's link list; -1 = free slot. */
  readonly linkIndex: Int32Array;
  /** 0..1 progress along the route. */
  readonly progress: Float32Array;
  /** ms to cross the full route at kind's current speed. */
  readonly durationMs: Float32Array;
  /** `ParticleKind` encoded 0=ok,1=retry,2=error. */
  readonly kind: Uint8Array;
  /** Whether this spawn is piling up at a cut instead of completing. */
  readonly piling: Uint8Array;
  private cursor = 0;
  private activeCount = 0;

  constructor(capacity: number = MAX_PARTICLES) {
    this.capacity = capacity;
    this.linkIndex = new Int32Array(capacity).fill(-1);
    this.progress = new Float32Array(capacity);
    this.durationMs = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.piling = new Uint8Array(capacity);
  }

  get active(): number {
    return this.activeCount;
  }

  /** Finds a free slot (round-robin from the last spawn point) and initializes it. No-op once every slot is busy. */
  spawn(linkIdx: number, kindCode: number, durationMs: number, piling: boolean): void {
    for (let i = 0; i < this.capacity; i++) {
      const slot = (this.cursor + i) % this.capacity;
      if (this.linkIndex[slot] === -1) {
        this.linkIndex[slot] = linkIdx;
        this.progress[slot] = 0;
        this.durationMs[slot] = Math.max(1, durationMs);
        this.kind[slot] = kindCode;
        this.piling[slot] = piling ? 1 : 0;
        this.cursor = (slot + 1) % this.capacity;
        this.activeCount++;
        return;
      }
    }
    // Pool is full: drop the spawn rather than growing or allocating.
  }

  /** Advances every active particle by `dtMs`; frees a slot once it reaches the end (unless it's piling up at a cut). */
  step(dtMs: number, onDone?: (slot: number) => void): void {
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.linkIndex[slot] === -1) continue;
      if (this.piling[slot]) continue; // frozen at the cut; cleared explicitly by the caller when the link heals.
      const next = this.progress[slot] + dtMs / this.durationMs[slot];
      if (next >= 1) {
        this.linkIndex[slot] = -1;
        this.activeCount--;
        onDone?.(slot);
      } else {
        this.progress[slot] = next;
      }
    }
  }

  /** Frees the particles piled up at a link's cut (it healed): they would otherwise stay frozen there. */
  releasePiling(linkIdx: number): void {
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.linkIndex[slot] === linkIdx && this.piling[slot]) {
        this.linkIndex[slot] = -1;
        this.piling[slot] = 0;
        this.activeCount--;
      }
    }
  }

  /** Frees every particle riding a given link (a link that stopped existing, or heals out of a cut). */
  clearLink(linkIdx: number): void {
    for (let slot = 0; slot < this.capacity; slot++) {
      if (this.linkIndex[slot] === linkIdx) {
        this.linkIndex[slot] = -1;
        this.activeCount--;
      }
    }
  }

  forEachActive(cb: (slot: number, linkIdx: number, progress: number, kind: number, piling: boolean) => void): void {
    for (let slot = 0; slot < this.capacity; slot++) {
      const linkIdx = this.linkIndex[slot];
      if (linkIdx === -1) continue;
      cb(slot, linkIdx, this.progress[slot], this.kind[slot], this.piling[slot] === 1);
    }
  }
}

/**
 * Samples a drawn path into a flat `[x0, y0, x1, y1, …]` table of `n + 1`
 * points evenly spaced by arc length (`pointAt(len)` is the SVG path's own
 * `getPointAtLength`). Particles then ride this table instead of calling
 * `getPointAtLength` per particle per frame; at ≤`SAMPLE_SPACING` px apart
 * the chord between two samples stays well under a pixel from the curve.
 */
export const SAMPLE_SPACING = 4;

export function samplePath(pointAt: (len: number) => { x: number; y: number }, length: number): Float32Array {
  const n = Math.max(16, Math.ceil(length / SAMPLE_SPACING));
  const out = new Float32Array((n + 1) * 2);
  for (let i = 0; i <= n; i++) {
    const p = pointAt((length * i) / n);
    out[i * 2] = p.x;
    out[i * 2 + 1] = p.y;
  }
  return out;
}

/** The point at progress `t` ∈ [0, 1] along a `samplePath` table (linear between samples). Writes into `out`. */
export function pointOnSamples(samples: Float32Array, t: number, out: { x: number; y: number }): { x: number; y: number } {
  const n = samples.length / 2 - 1;
  const f = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const k = f - i;
  out.x = samples[i * 2] + (samples[i * 2 + 2] - samples[i * 2]) * k;
  out.y = samples[i * 2 + 1] + (samples[i * 2 + 3] - samples[i * 2 + 1]) * k;
  return out;
}
