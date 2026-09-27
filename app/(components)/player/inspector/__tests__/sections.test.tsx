import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import {
  ProseSection,
  PairsSection,
  GridSection,
  BulletsSection,
  SourceSection,
  NotedSourceSection,
  RisksSection,
  AdvancedSection,
  SectionRenderer,
} from '../sections';
import type {
  ProsePart,
  PairsPart,
  GridPart,
  BulletsPart,
  SourcePart,
  NotedSourcePart,
  RisksPart,
  TradePart,
  CalcPart,
} from '../../types';

describe('section renderers', () => {
  it('prose: renders the title and the markdown body', async () => {
    const part: ProsePart = { shape: 'prose', pane: 'overview', title: 'Locking Architecture', md: 'Workers **own** ranges.' };
    const { container } = render(await ProseSection({ part }));
    expect(container).toHaveTextContent('Locking Architecture');
    expect(container.querySelector('strong')).toHaveTextContent('own');
  });

  it('prose: shows the "assumed" badge when the part is marked assumed', async () => {
    const part: ProsePart = { shape: 'prose', pane: 'overview', title: 'Sizing', md: 'Rough numbers.', assumed: true };
    const { getByText } = render(await ProseSection({ part }));
    expect(getByText('assumed')).toBeTruthy();
  });

  it('pairs: renders a definition list of every row, including the 3-tuple hint form', () => {
    const part: PairsPart = {
      shape: 'pairs',
      pane: 'overview',
      title: 'Cluster Bounds',
      pairs: [
        ['Scaling Metric', 'Target CPU > 60%'],
        ['Max Pods', 100, 'autoscaler ceiling'],
        ['Collision Rate', 0],
      ],
    };
    const { getByText, container } = render(<PairsSection part={part} />);
    expect(getByText('Scaling Metric')).toBeTruthy();
    expect(getByText('Target CPU > 60%')).toBeTruthy();
    const hinted = getByText('100');
    expect(hinted).toHaveAttribute('title', 'autoscaler ceiling');
    // A `0` value must render as the digit, not be treated as falsy/empty.
    expect(getByText('0')).toBeTruthy();
    // `null` renders as an em dash placeholder, not the literal string "null".
    expect(container).not.toHaveTextContent('null');
  });

  it('grid: renders a table with the given heads and cells, and a null cell as a placeholder (not blank or "null")', () => {
    // `PairsPart.pairs` values are `string | number` only (no `null`) — `Scalar`'s
    // null-placeholder path is a real, reachable case for `grid` cells instead
    // (`GridPart.cells: Scalar[][]`), so it's covered here.
    const part: GridPart = {
      shape: 'grid',
      pane: 'architecture',
      title: 'Health Check Spec',
      heads: ['Path', 'Interval', 'Threshold'],
      cells: [['/healthz', '5s', '2 successes'], ['/live', null, '—']],
    };
    const { getByRole } = render(<GridSection part={part} />);
    const table = getByRole('table');
    expect(table).toHaveTextContent('Path');
    expect(table).toHaveTextContent('/healthz');
    expect(table.textContent).toContain('—');
    expect(table.textContent).not.toContain('null');
    expect(table).toHaveTextContent('2 successes');
  });

  it('bullets: renders one list item per entry', () => {
    const part: BulletsPart = {
      shape: 'bullets',
      pane: 'overview',
      title: 'Notes',
      items: [{ text: 'First note' }, { text: 'Second note', mood: 'warn' }],
    };
    const { getByText, getAllByRole } = render(<BulletsSection part={part} />);
    expect(getByText('First note')).toBeTruthy();
    expect(getByText('Second note')).toBeTruthy();
    expect(getAllByRole('listitem')).toHaveLength(2);
  });

  it('source: renders highlighted code through CodeBlock', async () => {
    const part: SourcePart = { shape: 'source', pane: 'architecture', title: 'Schema', lang: 'sql', src: 'SELECT 1;' };
    const { container } = render(await SourceSection({ part }));
    expect(container.querySelector('pre.shiki')).toBeTruthy();
    expect(container).toHaveTextContent('SELECT 1;');
  });

  it('notedSource: annotates the line containing each note\'s term', async () => {
    const part: NotedSourcePart = {
      shape: 'notedSource',
      pane: 'architecture',
      title: 'API Request Schema',
      lang: 'javascript',
      src: 'const a = z.string().url();\nconst b = 2;',
      notes: [{ term: 'z.string().url()', md: 'Validates the input URL.' }],
    };
    const { container } = render(await NotedSourceSection({ part }));
    const lines = container.querySelectorAll('pre.shiki .line');
    expect(lines[0].className).toContain('shiki-line-annotated');
    expect(lines[1].className).not.toContain('shiki-line-annotated');
    expect(container).toHaveTextContent('Validates the input URL.');
  });

  it('notedSource: drops a note whose term is not found in the source instead of mis-annotating line 1', async () => {
    const part: NotedSourcePart = {
      shape: 'notedSource',
      pane: 'architecture',
      title: 'Schema',
      lang: 'sql',
      src: 'CREATE TABLE t (id int);',
      notes: [{ term: 'nonexistent_token', md: 'Should not appear.' }],
    };
    const { container } = render(await NotedSourceSection({ part }));
    const line = container.querySelector('pre.shiki .line');
    expect(line?.className).not.toContain('shiki-line-annotated');
    expect(container).not.toHaveTextContent('Should not appear.');
  });

  it('risks (bottlenecks): renders each risk with a severity chip, the danger and the remedy', () => {
    const part: RisksPart = {
      shape: 'risks',
      pane: 'operations',
      title: 'Range Exhaustion Bottlenecks',
      risks: [
        { text: 'Key Pool Capacity < 15%', danger: 'Writes hang.', remedy: 'Pre-generate keys daily.' },
        { text: 'Watched risk', danger: 'Bad thing.', remedy: 'Fix it.', alarm: 'a1' },
      ],
    };
    const { getByText } = render(<RisksSection part={part} />);
    expect(getByText('Key Pool Capacity < 15%')).toBeTruthy();
    expect(getByText('Writes hang.')).toBeTruthy();
    expect(getByText(/Pre-generate keys daily\./)).toBeTruthy();
    expect(getByText('Bottleneck')).toBeTruthy();
    expect(getByText('Watched bottleneck')).toBeTruthy();
  });

  it('advanced fallback: a tradeoff part renders its title and a "Coming soon" chip, not its axes/picks', () => {
    const part: TradePart = {
      shape: 'trade',
      pane: 'operations',
      title: 'Protocol Architecture',
      axes: [['Latency', 9]],
      picks: [{ text: 'Protobuf', plus: 'fast', minus: 'opaque' }],
    };
    const { getByText, queryByText } = render(<AdvancedSection part={part} />);
    expect(getByText('Protocol Architecture')).toBeTruthy();
    expect(getByText('Coming soon')).toBeTruthy();
    expect(queryByText('Protobuf')).toBeNull();
  });

  it('SectionRenderer dispatches a calc part (also advanced) to the same "Coming soon" fallback', () => {
    const part: CalcPart = { shape: 'calc', pane: 'operations', title: 'Compute Sizing Calculator', calc: 'c1' };
    const { getByText } = render(<SectionRenderer part={part} />);
    expect(getByText('Compute Sizing Calculator')).toBeTruthy();
    expect(getByText('Coming soon')).toBeTruthy();
  });
});
