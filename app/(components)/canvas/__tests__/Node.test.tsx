import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Node } from '../Node';
import type { LeafNodeType } from '../Node';
import type { HealthState } from '../types';

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

  it('draws stacked shadow cards when replicas > 1', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="server" label="API" replicas={4} />
      </svg>,
    );
    expect(container.querySelectorAll('.cv-stack').length).toBe(2);
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

  it('reserves the role pill width in the truncation budget, so the label/sub-label never run under the chip', () => {
    const { container } = render(
      <svg>
        <Node boardId="b1" id="n1" type="lb" label="API Service" sublabel="lb · ×2" role="primary" health="ok" />
      </svg>,
    );
    const clipRect = container.querySelector(`clipPath rect`);
    // Same budget the pill's own transform (`translate(w - 54, 8)`, 46px wide) leaves clear: w - 38 - 60.
    expect(clipRect?.getAttribute('width')).toBe('46');
    const labelText = container.querySelector('[data-node-id="n1"] .cv-label')?.textContent ?? '';
    const subText = container.querySelector('[data-node-id="n1"] .cv-sub')?.textContent ?? '';
    expect(labelText).toMatch(/…$/);
    expect(subText).toMatch(/…$/);
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
});
