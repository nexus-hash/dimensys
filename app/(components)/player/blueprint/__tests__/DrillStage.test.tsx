import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { DrillStage } from '../DrillStage';
import { PlayerStoreProvider, usePlayerStore } from '../../store/PlayerStoreProvider';

const boot = { diagramId: 'url-shortener', revision: 1, hash: 'sha256:abc', diagramUrl: '/solutions/url-shortener/diagram.json', hasSimulation: false, runtimeUrl: null, canvas: { w: 0, h: 0 } };

/** Reads the store's `drill` path so assertions don't reach into internals.
 * A plain `<div>` — not `<output>`, whose implicit `role="status"` would
 * collide with the component's own aria-live region in role queries. */
function DrillProbe() {
  const drill = usePlayerStore((s) => s.drill);
  return <div data-testid="drill-probe">{drill.join('>')}</div>;
}

/** A minimal stand-in for `DrilldownBlueprint`'s per-level markup, with a
 * collapsed-subsystem affordance (`data-node-id`) in the root level and a
 * frame tab (`data-subsystem-tab-id`) in the subsystem level, matching what
 * the real canvas kit renders. */
function Levels() {
  return (
    <>
      <div data-drill-key="" hidden={false} tabIndex={-1}>
        <button type="button" data-node-id="kgs-service" aria-label="Key Generation Service subsystem">
          Key Generation Service
        </button>
        <button type="button" data-node-id="not-a-subsystem">
          Cache
        </button>
      </div>
      <div data-drill-key="kgs-service" hidden tabIndex={-1}>
        <div data-subsystem-tab-id="kgs-worker-sub" role="button" tabIndex={0}>
          nested tab
        </div>
        <p>KGS contents</p>
      </div>
      <div data-drill-key="kgs-service>kgs-worker-sub" hidden tabIndex={-1}>
        <p>nested contents</p>
      </div>
    </>
  );
}

function renderStage() {
  return render(
    <PlayerStoreProvider bootstrap={boot}>
      <DrillProbe />
      <DrillStage rootLabel="URL shortener" labelsById={{ 'kgs-service': 'Key Generation Service', 'kgs-worker-sub': 'Nested' }}>
        <Levels />
      </DrillStage>
    </PlayerStoreProvider>,
  );
}

describe('DrillStage', () => {
  it('enters a subsystem on click of its collapsed affordance', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByText('Key Generation Service'));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service');
  });

  it('ignores a click on a plain node (not a known subsystem id)', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByText('Cache'));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('');
  });

  it('enters a subsystem on Enter and on Space from its collapsed affordance', async () => {
    const user = userEvent.setup();
    renderStage();
    screen.getByText('Key Generation Service').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service');

    // Back out, then try Space.
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('');
    screen.getByText('Key Generation Service').focus();
    await user.keyboard(' ');
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service');
  });

  it('enters a nested subsystem from an expanded frame\'s tab, to any depth', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByText('Key Generation Service'));
    await user.click(screen.getByText('nested tab'));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service>kgs-worker-sub');
  });

  it('Escape goes up exactly one level', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByText('Key Generation Service'));
    await user.click(screen.getByText('nested tab'));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service>kgs-worker-sub');
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service');
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('');
  });

  it('Escape at the top level does nothing', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('');
  });

  it('shows working breadcrumbs and lets a breadcrumb jump back', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByText('Key Generation Service'));
    await user.click(screen.getByText('nested tab'));

    const nav = within(screen.getByRole('navigation', { name: 'Subsystem breadcrumbs' }));
    expect(nav.getByText('URL shortener')).toBeTruthy();
    expect(nav.getByText('Key Generation Service')).toBeTruthy();
    expect(nav.getByText('Nested')).toHaveAttribute('aria-current', 'location');

    await user.click(nav.getByRole('button', { name: 'URL shortener' }));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('');
  });

  it('moves focus into the child level on entry, and announces it', async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByText('Key Generation Service'));
    const kgsLevel = document.querySelector('[data-drill-key="kgs-service"]');
    expect(kgsLevel).toBe(document.activeElement);
    expect(screen.getByRole('status')).toHaveTextContent('Entered Key Generation Service');
  });

  it('returns focus to the triggering element on exit', async () => {
    const user = userEvent.setup();
    renderStage();
    const trigger = screen.getByText('Key Generation Service');
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  it('hides the level it left once its leave animation ends (jsdom never fires this on its own)', async () => {
    const user = userEvent.setup();
    const { container } = renderStage();
    await user.click(screen.getByText('Key Generation Service'));
    const rootLevel = container.querySelector('[data-drill-key=""]')!;
    expect(rootLevel).not.toHaveAttribute('hidden');
    fireEvent(rootLevel, new Event('animationend'));
    expect(rootLevel).toHaveAttribute('hidden');
  });
});
