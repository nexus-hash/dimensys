import { describe, it, expect } from 'vitest';
import {
  SHARE_VERSION,
  decodeActions,
  decodeShare,
  encodeActions,
  encodeShare,
  fromBase64Url,
  hasShareParams,
  mergeShareIntoSearch,
  toBase64Url,
  walkthroughHref,
  type ShareState,
} from '../codec';
import type { UserAction } from '../../types';

const LOG: UserAction[] = [
  [12.3, 'kill', 'cache-redis', null],
  [14, 'spike', null, 10],
  [20.1, 'intervention', 'enable-coalescing', null],
  [22, 'toggle', 'write-consistency', 'one'],
  [25.5, 'calc', 'c1', 'req_rate=8000,execution_time=20'],
  [30, 'fault', 'cache-redis--hot-key', null],
  [31, 'slow', 'db', 2.5],
];

describe('share codec: every field round-trips', () => {
  const full: ShareState = {
    rev: 3,
    mode: 'break',
    selection: { kind: 'node', id: 'api-service' },
    t: 42.7,
    playing: false,
    speed: 2,
    camera: { x: 512, y: 300, z: 1.25 },
    actions: LOG,
  };

  it('a full Break it state', () => {
    const q = encodeShare(full);
    expect(q.startsWith(`?s=${SHARE_VERSION}&r=3&`)).toBe(true);
    const back = decodeShare(q);
    expect(back.dropped).toEqual([]);
    expect(back.version).toBe(SHARE_VERSION);
    expect(back.state).toEqual(full);
  });

  it('each field on its own', () => {
    const cases: ShareState[] = [
      { rev: 1, mode: 'break' },
      { rev: 1, selection: { kind: 'link', id: 'l-api-db' } },
      { rev: 1, selection: { kind: 'group', id: 'data.tier' } },
      { rev: 1, mode: 'walkthrough', view: 'write-path', step: 'step-2' },
      { rev: 1, view: 'cache-outage', choices: { cp1: 'scale', cp2: null } },
      { rev: 1, t: 5, playing: false },
      { rev: 1, speed: 4 },
      { rev: 1, speed: 0.5 },
      { rev: 1, camera: { x: -20, y: 0, z: 0.4 } },
      { rev: 1, actions: LOG, t: 31 },
    ];
    for (const c of cases) {
      const back = decodeShare(encodeShare(c)).state;
      // A walkthrough implies its mode; the reader resolves it against the diagram.
      const expected = c.mode === 'walkthrough' ? { ...c, mode: undefined } : c;
      expect(JSON.parse(JSON.stringify(back))).toEqual(JSON.parse(JSON.stringify(expected)));
    }
  });

  it('leaves defaults out: the healthy start is a clean URL', () => {
    expect(encodeShare({ rev: 1 })).toBe('');
    expect(encodeShare({ rev: 1, mode: 'explore', playing: true, speed: 1, t: 12 })).toBe('');
    // Time only when there's a run to rebuild or a paused frame.
    expect(encodeShare({ rev: 1, t: 12, selection: { kind: 'node', id: 'a' } })).toBe('?s=1&r=1&sel=n:a');
  });

  it('keeps action times, targets and values exactly (the rebuild is tick-exact)', () => {
    const odd: UserAction[] = [[0.30000000000000004, 'kill', 'x', null], [1e-7, 'degrade', 'y', 0.125], [3, 'toggle', 's', true]];
    expect(decodeActions(encodeActions(odd))!.actions).toEqual([...odd].sort((a, b) => a[0] - b[0]));
  });

  it('is readable: selection and camera are not percent-escaped', () => {
    const q = encodeShare({ rev: 2, selection: { kind: 'node', id: 'db' }, camera: { x: 1.44, y: 2.6, z: 1.23456 } });
    expect(q).toBe('?s=1&r=2&sel=n:db&cam=1.4,2.6,1.235');
  });

  it('base64url handles any text', () => {
    for (const s of ['', 'a', 'ab', 'abc', 'abcd', '[[1,"kill","ü-☃",null]]']) expect(fromBase64Url(toBase64Url(s))).toBe(s);
    expect(toBase64Url('???')).not.toMatch(/[+/=]/);
  });
});

describe('share codec: old and hand-made links', () => {
  it('a plain walkthrough link still reads', () => {
    const d = decodeShare('?v=write-path&st=3');
    expect(d.version).toBe(1);
    expect(d.dropped).toEqual([]);
    expect(d.state).toEqual({ view: 'write-path', step: '3' });
  });

  it('walkthroughHref makes a link the codec reads back', () => {
    const href = walkthroughHref('url-shortener', 'write-path', 's2');
    expect(href).toBe('/solutions/url-shortener?v=write-path&st=s2');
    expect(walkthroughHref('url-shortener', 'write-path')).toBe('/solutions/url-shortener?v=write-path');
    expect(decodeShare(href.split('?')[1]).state).toEqual({ view: 'write-path', step: 's2' });
  });

  it('keeps params it does not own when rewriting', () => {
    expect(mergeShareIntoSearch('?utm_source=x&v=old&a=zz', { rev: 1, mode: 'break' })).toBe('?utm_source=x&s=1&r=1&m=b');
    expect(mergeShareIntoSearch('?utm_source=x&m=b', { rev: 1 })).toBe('?utm_source=x');
    expect(mergeShareIntoSearch('?m=b&s=1', { rev: 1 })).toBe('');
    expect(hasShareParams('?utm_source=x')).toBe(false);
    expect(hasShareParams('?v=a')).toBe(true);
  });
});

describe('share codec: versioning', () => {
  it('a newer format keeps only the stable core and says what it dropped', () => {
    const d = decodeShare(`?s=${SHARE_VERSION + 1}&r=2&m=b&sel=n:a&v=wt&t=4&a=${encodeActions(LOG)}&zz=1`);
    expect(d.version).toBe(SHARE_VERSION + 1);
    expect(d.state).toEqual({ rev: 2, view: 'wt', t: 4, actions: [...LOG] });
    expect(d.dropped.sort()).toEqual(['m', 'sel']);
  });

  it('an unreadable version is treated as this one, and reported', () => {
    const d = decodeShare('?s=banana&m=b');
    expect(d.version).toBe(1);
    expect(d.state.mode).toBe('break');
    expect(d.dropped).toEqual(['s']);
  });
});

describe('share codec: malformed input never throws', () => {
  it('drops each bad param on its own', () => {
    const d = decodeShare('?s=1&r=-1&m=zz&sel=q:x&t=abc&p=2&x=3&cam=1,2&ch=:a&st=nov&a=!!!');
    expect(d.state).toEqual({});
    expect(d.dropped.sort()).toEqual(['a', 'cam', 'ch', 'm', 'p', 'r', 'sel', 'st', 't', 'x'].sort());
  });

  it('rejects ids with odd characters, huge times and zero zoom', () => {
    const d = decodeShare('?v=<script>&sel=n:a%20b&t=1e9&cam=1,2,0');
    expect(d.state).toEqual({});
    expect(d.dropped.sort()).toEqual(['cam', 'sel', 't', 'v']);
  });

  it('keeps the good entries of a partly bad log, sorted by time', () => {
    const raw = toBase64Url(JSON.stringify([[5, 'kill', 'a', null], [1, 'kill', 'b', null], ['x', 'kill', 'c', null], [2, 'KILL', 'd', null], [3, 'slow', 'e', {}]]));
    const d = decodeShare(`?a=${raw}`);
    expect(d.state.actions).toEqual([
      [1, 'kill', 'b', null],
      [5, 'kill', 'a', null],
    ]);
    expect(d.dropped).toEqual(['a']);
  });

  it('survives garbage', () => {
    const junk = ['', '?', '?a=', '?a=%', '?a=AAAA', `?a=${toBase64Url('{"x":1}')}`, `?a=${toBase64Url('[1,2')}`, '?a=' + 'A'.repeat(9000), '?cam=,,', '?ch=a:b:c', '?sel=:', '?x=Infinity'];
    for (const q of junk) expect(() => decodeShare(q)).not.toThrow();
    // Random bytes too.
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 300; i++) {
      const s = Array.from({ length: Math.floor(rnd() * 60) }, () => String.fromCharCode(32 + Math.floor(rnd() * 95))).join('');
      expect(() => decodeShare(`?a=${encodeURIComponent(s)}&sel=${encodeURIComponent(s)}&cam=${encodeURIComponent(s)}`)).not.toThrow();
    }
  });

  it('caps the log: an over-long param is refused whole', () => {
    const many: UserAction[] = Array.from({ length: 600 }, (_, i) => [i, 'kill', 'a', null]);
    expect(decodeActions(encodeActions(many))).toBeNull();
    expect(decodeActions(toBase64Url(JSON.stringify(many.slice(0, 200))))!.actions).toHaveLength(200);
  });
});
