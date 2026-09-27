import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Link, estimatePillSize } from '../Link';
import { SubsystemCollapsed, SubsystemFrame } from '../Subsystem';
import { DsaCell } from '../DsaCell';
import { PointerMarker } from '../PointerMarker';
import { LldCard } from '../LldCard';
import type { DsaCellState } from '../types';

describe('Link', () => {
  it.each(['sync', 'async', 'stream'] as const)('renders the %s protocol style', (protocol) => {
    const { container } = render(
      <svg>
        <Link boardId="b1" id="l1" d="M0,0 L100,0" protocol={protocol} />
      </svg>,
    );
    const path = container.querySelector('.cv-link');
    expect(path).toBeTruthy();
    if (protocol !== 'sync') {
      expect(path?.getAttribute('class')).toContain(`is-${protocol}`);
    }
  });

  it('renders a label pill at the given position', () => {
    const { getByText } = render(
      <svg>
        <Link boardId="b1" id="l1" d="M0,0 L100,0" protocol="sync" label="write path" labelPosition={{ x: 50, y: 0 }} />
      </svg>,
    );
    expect(getByText('write path')).toBeTruthy();
  });

  it('draws the pill rect at exactly `labelSize` when given (GEOM: the route\'s `cap.sz`), not a re-derived estimate', () => {
    const { container } = render(
      <svg>
        <Link boardId="b1" id="l1" d="M0,0 L100,0" protocol="sync" label="Write/Read DB" labelPosition={{ x: 50, y: 0 }} labelSize={[123.4, 20]} />
      </svg>,
    );
    const rect = container.querySelector('.cv-link-label rect');
    expect(rect?.getAttribute('width')).toBe('123.4');
    expect(rect?.getAttribute('height')).toBe('20');
    expect(rect?.getAttribute('x')).toBe(String(-123.4 / 2));
  });

  it(
    "estimatePillSize (GEOM: this player's own pill-drawing constants — the layout engine's label-geometry module is its named counterpart) matches 7.3px/char, 7px pad each side, 20px tall, 80px floor",
    () => {
      expect(estimatePillSize('ok')).toEqual([80, 20]);
      expect(estimatePillSize('Write/Read DB')).toEqual(['Write/Read DB'.length * 7.3 + 14, 20]);
      expect(estimatePillSize('Get New Key')).toEqual(['Get New Key'.length * 7.3 + 14, 20]);
    },
  );

  it('renders a partitioned link with the cut glyph', () => {
    const { getByText } = render(
      <svg>
        <Link boardId="b1" id="l1" d="M0,0 L100,0" protocol="sync" partitioned cutPosition={{ x: 50, y: 0 }} />
      </svg>,
    );
    expect(getByText('✂')).toBeTruthy();
  });

  it('accepts a children slot reserved for the particle layer (T3.3)', () => {
    const { container } = render(
      <svg>
        <Link boardId="b1" id="l1" d="M0,0 L100,0" protocol="sync">
          <circle data-testid="particle-slot" r={2} />
        </Link>
      </svg>,
    );
    expect(container.querySelector('[data-testid="particle-slot"]')).toBeTruthy();
  });
});

describe('Subsystem', () => {
  it('renders the collapsed affordance with node count and health', () => {
    const { container } = render(
      <svg>
        <SubsystemCollapsed boardId="b1" id="sub1" label="Key Generation Service" nodeCount={5} health="warn" healthLabel="p99 900 ms" />
      </svg>,
    );
    const g = container.querySelector('[data-node-id="sub1"]');
    expect(g?.getAttribute('aria-label')).toContain('5 nodes');
    expect(g?.getAttribute('aria-label')).toContain('warn');
  });

  it('renders the expanded frame with a tab label', () => {
    const { getByText } = render(
      <svg>
        <SubsystemFrame boardId="b1" id="frame1" label="cluster" width={400} height={300} />
      </svg>,
    );
    expect(getByText('CLUSTER')).toBeTruthy();
  });

  it('truncates a long frame tab label with an ellipsis instead of overflowing', () => {
    const { container, queryByText } = render(
      <svg>
        <SubsystemFrame
          boardId="b1"
          id="frame2"
          label="a very long subsystem name that will not fit the tab"
          width={200}
          height={100}
        />
      </svg>,
    );
    const tab = container.querySelector('.cv-tab');
    expect(tab?.textContent).toMatch(/…$/);
    expect(tab?.textContent?.length).toBeLessThan('A VERY LONG SUBSYSTEM NAME THAT WILL NOT FIT THE TAB'.length);
    expect(queryByText('A VERY LONG SUBSYSTEM NAME THAT WILL NOT FIT THE TAB')).toBeNull();
  });
});

describe('DsaCell', () => {
  const states: DsaCellState[] = ['default', 'active', 'compare', 'visited', 'done', 'error'];
  it.each(states)('renders the %s cell state', (state) => {
    const { container } = render(
      <svg>
        <DsaCell id="c0" value={7} state={state} />
      </svg>,
    );
    const g = container.querySelector('[data-cell-id="c0"]');
    expect(g).toBeTruthy();
    expect(g?.getAttribute('class')).toContain(`cv-cell-${state}`);
  });
});

describe('PointerMarker', () => {
  it('renders its label and stacks a second marker above the first', () => {
    const { container, getByText } = render(
      <svg>
        <PointerMarker id="m-i" label="i" x={0} y={0} stackIndex={0} />
        <PointerMarker id="m-j" label="j" x={0} y={0} stackIndex={1} />
      </svg>,
    );
    expect(getByText('i')).toBeTruthy();
    expect(getByText('j')).toBeTruthy();
    const gi = container.querySelector('[data-marker-id="m-i"]');
    const gj = container.querySelector('[data-marker-id="m-j"]');
    expect(gi?.getAttribute('transform')).not.toBe(gj?.getAttribute('transform'));
  });
});

describe('LldCard', () => {
  it('renders name, fields and methods with visibility glyphs', () => {
    const { getByText } = render(
      <svg>
        <LldCard
          id="card1"
          name="UrlShortener"
          fields={[{ name: 'db', type: 'Database', visibility: 'private' }]}
          methods={[{ name: 'shorten', params: [{ name: 'url', type: 'string' }], returns: 'string', visibility: 'public' }]}
        />
      </svg>,
    );
    expect(getByText('UrlShortener')).toBeTruthy();
    expect(getByText(/− db: Database/)).toBeTruthy();
    expect(getByText(/\+ shorten\(url: string\): string/)).toBeTruthy();
  });
});
