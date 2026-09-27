import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeInspectorBody } from '../NodeInspectorBody';
import type { NodeView } from '../../types';

/**
 * Only sync-safe shapes (`pairs`/`grid`/`bullets`/`risks`, plus the
 * `trade`/`calc` advanced fallback) are used here — `prose`/`source`/
 * `notedSource` wrap async Server Components (`Markdown`/`CodeBlock`/
 * `AnnotatedCode`), which `@testing-library/react`'s plain DOM renderer
 * can't itself await; those three get their own renderer-level tests in
 * `sections.test.tsx`. This file is about the tab/grouping logic, which is
 * independent of which shape backs a given pane.
 */
function node(sheet: NodeView['sheet']): NodeView {
  return { id: 'n1', form: 'server', text: 'API', sheet };
}

describe('NodeInspectorBody', () => {
  it('renders "no details" for a node with no sheet', () => {
    render(<NodeInspectorBody node={node(undefined)} />);
    expect(screen.getByRole('status')).toHaveTextContent('No additional details');
  });

  it('renders "no details" for a node whose sheet has no parts', () => {
    render(<NodeInspectorBody node={node({ parts: [] })} />);
    expect(screen.getByRole('status')).toHaveTextContent('No additional details');
  });

  it('a single-pane sheet renders flat, with no tab strip', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [{ shape: 'pairs', pane: 'overview', title: 'Specs', pairs: [['Region', 'us-east-1']] }],
        })}
      />,
    );
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Specs')).toBeTruthy();
    expect(screen.getByText('us-east-1')).toBeTruthy();
  });

  it('multiple panes render one tab per pane, in first-appearance order', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            { shape: 'pairs', pane: 'operations', title: 'Ops specs', pairs: [['a', '1']] },
            { shape: 'pairs', pane: 'overview', title: 'Overview specs', pairs: [['b', '2']] },
            { shape: 'grid', pane: 'operations', title: 'Ops table', heads: ['x'], cells: [['y']] },
          ],
        })}
      />,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Operations', 'Overview']);
  });

  it('the tab label is the humanised pane id, and switching tabs shows that pane\'s sections', async () => {
    const user = userEvent.setup();
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            { shape: 'pairs', pane: 'overview', title: 'Overview specs', pairs: [['a', '1']] },
            { shape: 'risks', pane: 'operations', title: 'Bottlenecks', risks: [{ text: 'R1', danger: 'D1', remedy: 'M1' }] },
          ],
        })}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Overview specs')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Operations' }));
    expect(screen.getByText('Bottlenecks')).toBeVisible();
    expect(screen.getByText('R1')).toBeTruthy();
  });

  it('tabs are keyboard-navigable (arrow key moves focus and selection)', async () => {
    const user = userEvent.setup();
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            { shape: 'pairs', pane: 'overview', title: 'Overview specs', pairs: [['a', '1']] },
            { shape: 'pairs', pane: 'operations', title: 'Ops specs', pairs: [['b', '2']] },
          ],
        })}
      />,
    );
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Operations' })).toHaveAttribute('aria-selected', 'true');
  });

  it('defaults to the Overview tab even when another pane appears first in the sheet', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            { shape: 'pairs', pane: 'operations', title: 'Ops specs', pairs: [['a', '1']] },
            { shape: 'pairs', pane: 'overview', title: 'Overview specs', pairs: [['b', '2']] },
          ],
        })}
      />,
    );
    // Strip order is still first-appearance (Operations, then Overview) …
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Operations', 'Overview']);
    // … but Overview is the one that starts active, so the first thing shown is real content.
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Overview specs')).toBeVisible();
  });

  it('falls back to first-appearance order for the default tab when there is no Overview pane', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            { shape: 'pairs', pane: 'operations', title: 'Ops specs', pairs: [['a', '1']] },
            { shape: 'pairs', pane: 'architecture', title: 'Arch specs', pairs: [['b', '2']] },
          ],
        })}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Operations' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves a pane made entirely of deferred/"Coming soon" sections after every pane with real content, regardless of appearance order', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            // "deferred" appears FIRST in the sheet, but has no real (simple-shape) section.
            { shape: 'trade', pane: 'deferred', title: 'Tradeoffs', axes: [['Speed', 9]], picks: [] },
            { shape: 'pairs', pane: 'overview', title: 'Overview specs', pairs: [['a', '1']] },
          ],
        })}
      />,
    );
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Overview', 'Deferred']);
    // And since Overview now also happens to be first, it's still what starts active.
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps a mixed pane (real content + an advanced part) in its original spot — only an all-advanced pane is demoted', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [
            {
              shape: 'trade',
              pane: 'operations',
              title: 'Tradeoffs',
              axes: [['Speed', 9]],
              picks: [],
            },
            { shape: 'risks', pane: 'operations', title: 'Bottlenecks', risks: [{ text: 'R1', danger: 'D1', remedy: 'M1' }] },
            { shape: 'pairs', pane: 'overview', title: 'Overview specs', pairs: [['a', '1']] },
          ],
        })}
      />,
    );
    // "operations" has a real `risks` section alongside the advanced `trade` one, so it is NOT
    // demoted — strip order stays first-appearance (Operations, then Overview).
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Operations', 'Overview']);
  });

  it('an advanced (not-yet-rendered) shape shows the "Coming soon" fallback instead of dropping the part', () => {
    render(
      <NodeInspectorBody
        node={node({
          parts: [{ shape: 'trade', pane: 'operations', title: 'Key Generation Trade-offs', axes: [['Speed', 9]], picks: [] }],
        })}
      />,
    );
    expect(screen.getByText('Key Generation Trade-offs')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  it('section headings start at h3 (the inspector header above it owns the h2)', () => {
    render(
      <NodeInspectorBody
        node={node({ parts: [{ shape: 'pairs', pane: 'overview', title: 'Specs', pairs: [['a', '1']] }] })}
      />,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(within(heading.parentElement!).getByText('Specs')).toBeTruthy();
  });
});
