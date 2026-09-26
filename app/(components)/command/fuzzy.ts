/**
 * A small hand-written fuzzy scorer (no dependency). Subsequence match: every
 * character of the query must appear in the target, in order, but not
 * necessarily contiguous. Scores reward contiguous runs and matches at a
 * word boundary (start of string, or right after a separator), and lightly
 * penalize matches that start late or targets that are much longer than the
 * query, so "cache" ranks "Redis Cache" above "Cache-adjacent worker pool".
 *
 * O(target.length) per candidate — fast enough to run over ~200 items well
 * under a 16ms budget (see `__tests__/fuzzy.perf.test.ts`).
 */

export interface FuzzyMatch {
  score: number;
  /** Indices into `target` (lowercased) that matched, for optional highlighting. */
  indices: number[];
}

const SEPARATOR_RE = /[\s\-_/·:]/;

/** Returns `null` when `query` isn't a subsequence of `target`. Empty query always matches with score 0. */
export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (query.length === 0) return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  let score = 0;
  let prevMatchIndex = -1;
  let run = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;

    indices.push(ti);
    let charScore = 10;

    if (prevMatchIndex === ti - 1) {
      run++;
      charScore += run * 6;
    } else {
      run = 0;
    }

    if (ti === 0 || SEPARATOR_RE.test(t[ti - 1])) {
      charScore += 8;
    }

    // Exact-case match (before lowercasing) at this position — e.g. an
    // acronym like "HLD" — gets a small bonus over an incidental lowercase hit.
    if (target[ti] === query[qi]) charScore += 2;

    score += charScore;
    prevMatchIndex = ti;
    qi++;
  }

  if (qi < q.length) return null;

  // Prefer matches that start earlier and targets that aren't much longer
  // than the query (fewer "extra" characters to scan past).
  score -= indices[0];
  score -= Math.max(0, t.length - q.length) * 0.5;

  return { score, indices };
}

export interface Scorable {
  label: string;
  keywords?: string[];
}

export interface ScoredResult<T> {
  item: T;
  score: number;
  indices: number[];
}

/**
 * Scores and sorts a list of candidates against a query. Each candidate is
 * matched against its label and, if present, its keywords — the best of
 * those matches wins. Ties break by shorter label (more specific) then by
 * original order (stable).
 */
export function fuzzyFilter<T extends Scorable>(query: string, items: readonly T[]): ScoredResult<T>[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return items.map((item) => ({ item, score: 0, indices: [] }));
  }

  const results: ScoredResult<T>[] = [];
  for (const item of items) {
    let best: FuzzyMatch | null = fuzzyMatch(trimmed, item.label);
    if (item.keywords) {
      for (const kw of item.keywords) {
        const m = fuzzyMatch(trimmed, kw);
        if (m && (!best || m.score > best.score)) best = m;
      }
    }
    if (best) results.push({ item, score: best.score, indices: best.indices });
  }

  results.sort((a, b) => b.score - a.score || a.item.label.length - b.item.label.length);
  return results;
}
