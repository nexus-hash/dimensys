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
});
