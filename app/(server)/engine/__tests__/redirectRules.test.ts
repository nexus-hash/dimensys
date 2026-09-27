import { describe, expect, it } from 'vitest';
import { buildAliasRedirects, legacy2dRedirect } from '../redirectRules';

describe('buildAliasRedirects', () => {
  it('emits one permanent redirect per formerly id, to the canonical /solutions/<id>', () => {
    const rules = buildAliasRedirects([
      { id: 'url-shortener', formerly: ['hld-url-shortener', 'url-shortener-01'] },
      { id: 'whatsapp', formerly: ['hld-whatsapp'] },
    ]);

    expect(rules).toEqual([
      { source: '/solutions/hld-url-shortener', destination: '/solutions/url-shortener', permanent: true },
      { source: '/solutions/url-shortener-01', destination: '/solutions/url-shortener', permanent: true },
      { source: '/solutions/hld-whatsapp', destination: '/solutions/whatsapp', permanent: true },
    ]);
  });

  it('skips cards with no formerly ids', () => {
    expect(buildAliasRedirects([{ id: 'two-sum' }])).toEqual([]);
  });

  it('never redirects an id to itself', () => {
    expect(buildAliasRedirects([{ id: 'two-sum', formerly: ['two-sum'] }])).toEqual([]);
  });

  it('ignores empty-string formerly entries', () => {
    expect(buildAliasRedirects([{ id: 'two-sum', formerly: [''] }])).toEqual([]);
  });
});

describe('legacy2dRedirect', () => {
  it('rewrites the old /2d/[problemId] viewer to /solutions/[id], needing no catalog data', () => {
    expect(legacy2dRedirect()).toEqual({
      source: '/2d/:problemId',
      destination: '/solutions/:problemId',
      permanent: true,
    });
  });
});
