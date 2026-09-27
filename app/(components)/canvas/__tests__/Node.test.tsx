import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Node } from '../Node';
import type { LeafNodeType } from '../Node';
import type { HealthState } from '../types';
import { NODE_WIDTH } from '../types';

const ALL_TYPES: LeafNodeType[] = [
  'client',
  'lb',
  'apiGateway',
  'server',
  'worker',
  'orchestrator',
  'cache',
  'cdn',
  'db',
  'objectStore',
  'queue',
  'messageBus',
  'cloud',
  'external',
];

const ALL_HEALTH: HealthState[] = ['ok', 'warn', 'critical', 'down', 'recovering'];

function renderNode(type: LeafNodeType, health: HealthState) {
  return render(
    <svg>
      <Node
        boardId="b1"
        id={`n-${type}-${health}`}
        type={type}
        label="API Service"
        sublabel={`${type} · v1`}
        health={health}
        healthLabel={health !== 'ok' ? 'p99 640 ms' : undefined}
      />
    </svg>,
  );
}

describe('Node', () => {
  it.each(ALL_TYPES)('renders the %s node type', (type) => {
    const { container } = renderNode(type, 'ok');
    expect(container.querySelector('[data-node-id]')).toBeTruthy();
    expect(container.querySelector('.cv-body')).toBeTruthy();
  });

  it.each(ALL_HEALTH)('renders the %s health state', (health) => {
    const { container } = renderNode('server', health);
    const g = container.querySelector('[data-node-id]');
    expect(g).toBeTruthy();
    if (health !== 'ok') {
      expect(g?.getAttribute('class')).toContain(`cv-health-${health}`);
    } else {
      expect(g?.getAttribute('class')).not.toMatch(/cv-health-/);
    }
  });

  it('gives every node an accessible name that includes the label and type', () => {
    const { container } = renderNode('db', 'critical');
    const g = container.querySelector('[data-node-id]');
    const label = g?.getAttribute('aria-label') ?? '';
    expect(label).toContain('API Service');
    expect(label).toContain('db');
    expect(label).toMatch(/critical/i);
  });

  it('describes health without relying on color alone (glyph text differs per state)', () => {
    for (const health of ['warn', 'critical', 'down', 'recovering'] as HealthState[]) {
      const { container } = renderNode('server', health);
      const label = container.querySelector('[data-node-id]')?.getAttribute('aria-label') ?? '';
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('is focusable and interactive by default (role=button, tabIndex=0)', () => {
    const { container } = renderNode('server', 'ok');
    const g = container.querySelector('[data-node-id]');
    expect(g?.getAttribute('role')).toBe('button');
    expect(g?.getAttribute('tabindex')).toBe('0');
  });

  it('renders as a non-interactive image when interactive=false', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" interactive={false} />
      </svg>,
    );
    const g = container.querySelector('[data-node-id]');
    expect(g?.getAttribute('role')).toBe('img');
    expect(g?.getAttribute('tabindex')).toBe('-1');
  });

  it('renders text as real <text>, not paths (a11y: selectable, screen-reader friendly)', () => {
    const { container } = renderNode('server', 'ok');
    const label = container.querySelector('.cv-label');
    expect(label?.tagName.toLowerCase()).toBe('text');
    expect(label?.textContent).toBe('API Service');
  });

  it('draws stacked shadow cards when replicas > 1, offset +4/+8px (FID)', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" replicas={4} />
      </svg>,
    );
    const stacks = container.querySelectorAll('.cv-stack');
    expect(stacks.length).toBe(2);
    const offsets = Array.from(stacks)
      .map((s) => Number(s.getAttribute('x')))
      .sort((a, b) => a - b);
    expect(offsets).toEqual([4, 8]);
  });

  it('a selected replicated node keeps a stack card in the DOM for its own outline (option B: the group reads as selected without the halo covering the back cards)', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" replicas={4} selected />
      </svg>,
    );
    const g = container.querySelector('[data-node-id="n1"]');
    expect(g?.classList.contains('is-selected')).toBe(true);
    // The back cards render regardless of selection (globals.css supplies the
    // `.is-selected .cv-stack` outline; this pins the markup that rule needs).
    expect(container.querySelectorAll('.cv-stack').length).toBe(2);
    // The halo/ring stay sized off the front card only (never the +8px stack
    // extent), so they can't visually cover the back cards.
    const halo = g?.querySelector('.cv-halo');
    expect(halo?.getAttribute('x')).toBe('-5');
    expect(halo?.getAttribute('width')).toBe(String(NODE_WIDTH + 10));
  });

  it('truncates a long label with an ellipsis instead of overflowing, keeping the full text in aria-label and a <title>', () => {
    const longLabel = 'Billing DB (MySQL, Multi-AZ Replica Set)';
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="db" label={longLabel} />
      </svg>,
    );
    const g = container.querySelector('[data-node-id="n1"]');
    const labelText = g?.querySelector('.cv-label')?.textContent ?? '';
    expect(labelText).toMatch(/…$/);
    expect(labelText.length).toBeLessThan(longLabel.length);
    // Full text always ships regardless of what's visually truncated.
    expect(g?.getAttribute('aria-label')).toContain(longLabel);
    expect(g?.querySelector('title')?.textContent).toContain(longLabel);
  });

  it('truncates a long sub-label the same way', () => {
    const longSublabel = 'server · api-gateway-canary-region-us-east-1';
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" sublabel={longSublabel} />
      </svg>,
    );
    const subText = container.querySelector('[data-node-id="n1"] .cv-sub')?.textContent ?? '';
    expect(subText).toMatch(/…$/);
    expect(subText.length).toBeLessThan(longSublabel.length);
  });

  it('does not truncate a label/sub-label that already fits', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" sublabel="server · api" />
      </svg>,
    );
    expect(container.querySelector('[data-node-id="n1"] .cv-label')?.textContent).toBe('API');
    expect(container.querySelector('[data-node-id="n1"] .cv-sub')?.textContent).toBe('server · api');
  });

  it('renders a <title> tooltip combining label and sub-label', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API Service" sublabel="server · api" />
      </svg>,
    );
    expect(container.querySelector('[data-node-id="n1"] > title')?.textContent).toBe('API Service — server · api');
  });

  it('folds the role into the sub-label instead of a top-right pill, so the label keeps its full width', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="lb" label="API Service" sublabel="lb · ×2" role="primary" health="ok" />
      </svg>,
    );
    const g = container.querySelector('[data-node-id="n1"]');
    // No more floating rect+text pill over the card's top-right border.
    expect(g?.querySelector('.cv-role')).toBeNull();
    // The label isn't squeezed by a reserved pill width anymore — "API
    // Service" fits the ordinary (glyph-free) text area untruncated.
    expect(container.querySelector('[data-node-id="n1"] .cv-label')?.textContent).toBe('API Service');
    // The role reads inline, appended to the sub-label (truncated here, same
    // as any other over-long sub-label — the full "lb · ×2 · primary" still
    // ships in the title/aria-label below).
    const subText = container.querySelector('[data-node-id="n1"] .cv-sub')?.textContent ?? '';
    expect(subText).toMatch(/^lb · ×2 · pr.*…$/);
    expect(g?.querySelector('title')?.textContent).toBe('API Service — lb · ×2 · primary');
  });

  it('shows the role in the sub-label even with no sub-label prop of its own', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" role="leader" health="ok" />
      </svg>,
    );
    expect(container.querySelector('[data-node-id="n1"] .cv-sub')?.textContent).toBe('leader');
  });

  it('hides the role once a health glyph is showing (same top-right slot)', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" sublabel="server · api" role="primary" health="critical" />
      </svg>,
    );
    expect(container.querySelector('[data-node-id="n1"] .cv-sub')?.textContent).toBe('server · api');
  });

  it('the down state keeps the label/sub-label legible (not folded into the heavily-dimmed inner group)', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="cache" label="Redis Cache" sublabel="cache · redis" health="down" />
      </svg>,
    );
    // The text layer is its own sibling, outside `.cv-inner` (which is dimmed to .3 for `down`).
    const inner = container.querySelector('[data-node-id="n1"] .cv-inner');
    expect(inner?.querySelector('.cv-label')).toBeNull();
    const text = container.querySelector('[data-node-id="n1"] .cv-text');
    expect(text?.querySelector('.cv-label')?.textContent).toBe('Redis Cache');
  });

  describe('meter row (FID)', () => {
    function rectRight(el: Element | null): number {
      return Number(el?.getAttribute('x')) + Number(el?.getAttribute('width'));
    }
    function textLeft(el: Element | null, charWidth: number): number {
      // `textAnchor="end"`: the rendered text runs left from `x` by its own estimated width.
      const x = Number(el?.getAttribute('x'));
      const len = (el?.textContent ?? '').length;
      return x - len * charWidth;
    }

    it('sets a `data-meter-kind` attribute matching the meter passed in, and none when there is no meter', () => {
      const { container: withMeter } = render(
        <svg>
          <Node boardId="b1" id="n1" type="cache" label="Redis" meter={{ kind: 'hit', value: 0.9, text: 'hit 90%' }} />
        </svg>,
      );
      expect(withMeter.querySelector('[data-node-id="n1"]')?.getAttribute('data-meter-kind')).toBe('hit');

      const { container: without } = render(
        <svg>
          <Node boardId="b1" id="n2" type="client" label="Web" />
        </svg>,
      );
      expect(without.querySelector('[data-node-id="n2"]')?.hasAttribute('data-meter-kind')).toBe(false);
    });

    it.each([
      ['util', '0%'],
      ['util', '142%'],
      ['hit', 'hit 90%'],
      ['backlog', '9999 msgs'],
    ] as const)('keeps the bar and the %s meter value ("%s") disjoint, regardless of text length', (kind, text) => {
      const { container } = render(
        <svg>
          <Node boardId="b1" id="n1" type="server" label="API" meter={{ kind, value: 0.5, text }} />
        </svg>,
      );
      const track = container.querySelector('.cv-mtrack');
      const valueText = container.querySelector('.cv-mtext');
      expect(valueText?.textContent).toBe(text);
      const barRight = rectRight(track);
      // Mono 11px at the estimate this component itself uses (`METER_TEXT_FONT_SIZE * MONO_CHAR_EM`).
      const valueLeft = textLeft(valueText, 11 * 0.6);
      expect(barRight).toBeLessThanOrEqual(valueLeft + 1e-6);
    });

    it('never overlaps the meter value for the longest reading each kind can realistically show', () => {
      const longest: Record<string, string> = { util: '142%', hit: 'hit 100%', backlog: '9999 msgs', lag: 'lag 999 s' };
      for (const [kind, text] of Object.entries(longest)) {
        const { container } = render(
          <svg>
            <Node boardId="b1" id={`n-${kind}`} type="server" label="API" meter={{ kind: kind as never, value: 1, text }} />
          </svg>,
        );
        const track = container.querySelector('.cv-mtrack');
        const barRight = rectRight(track);
        const valueLeft = textLeft(container.querySelector('.cv-mtext'), 11 * 0.6);
        expect({ kind, disjoint: barRight <= valueLeft + 1e-6 }).toEqual({ kind, disjoint: true });
      }
    });
  });
});
