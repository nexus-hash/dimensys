import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `TopBar`'s ⌘K button reaches `CommandPalette`, which calls `useRouter()`.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { PlayerShell } from '../PlayerShell';
import { buildElementIndex } from '../selection';
import { modeAvailability } from '../modes';
import { PlayerStoreProvider, usePlayerStore, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import { CommandProvider } from '@/app/(components)/command';
import type { Board } from '../../types';
import type { PlayerBootstrap } from '../../types';

const boot: PlayerBootstrap = {
  diagramId: 'url-shortener',
  revision: 1,
  hash: 'sha256:abc',
  diagramUrl: '/solutions/url-shortener/diagram.json',
  hasSimulation: false,
  runtimeUrl: null,
  simUrl: null,
  canvas: { w: 800, h: 400 },
};

const board: Board = {
  size: [800, 400],
  blocks: [
    { id: 'api', form: 'server', text: 'API', box: [100, 100, 120, 60] },
    { id: 'cache', form: 'cache', text: 'Redis', box: [300, 100, 120, 60] },
  ],
  wires: [{ id: 'l1', a: 'api', b: 'cache', line: 'sync', route: [[220, 100], [300, 100]] }],
};

/** Selects a node the way `InteractiveLayer` does — writes `selection` on the store directly. */
function SelectButton({ id, label }: { id: string; label: string }) {
  const store = usePlayerStoreApi();
  return (
    <button type="button" onClick={() => store.setState({ selection: { kind: 'node', id } })}>
      {label}
    </button>
  );
}

function ModeProbe() {
  const mode = usePlayerStore((s) => s.mode);
  return <div data-testid="mode-probe">{mode}</div>;
}

function renderShell() {
  const elementIndex = buildElementIndex(board);
  const availability = modeAvailability({ kit: undefined, stories: [] });
  return render(
    <CommandProvider navItems={[]}>
      <PlayerStoreProvider bootstrap={boot}>
        <ModeProbe />
        <SelectButton id="api" label="select api" />
        <PlayerShell title="URL shortener" labelsById={{}} elementIndex={elementIndex} modeAvailability={availability}>
          <div data-testid="board-child">board</div>
        </PlayerShell>
      </PlayerStoreProvider>
    </CommandProvider>,
  );
}

describe('PlayerShell', () => {
  it('renders the frames (top bar, rail, canvas child, inspector absent) and reflects mode on the root', () => {
    const { container } = renderShell();
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Problem, scenarios and walkthroughs' })).toBeTruthy();
    expect(screen.getByTestId('board-child')).toBeTruthy();
    expect(container.querySelector('.player-shell')).toHaveAttribute('data-player-mode', 'explore');
    // No selection yet: the inspector frame isn't rendered.
    expect(screen.queryByRole('complementary', { name: 'Inspector' })).toBeNull();
  });

  it('shows the mode switcher with Explore available and Break it/Walkthrough hidden (no kit, no stories)', () => {
    renderShell();
    const seg = screen.getByRole('radiogroup', { name: 'Mode' });
    expect(within(seg).getByText('Explore')).toBeTruthy();
    expect(within(seg).queryByText('Break it')).toBeNull();
    expect(within(seg).queryByText('Walkthrough')).toBeNull();
    // Build is a real, just-not-built-yet destination: shown, disabled.
    expect(within(seg).getByRole('radio', { name: /Build/ })).toHaveAttribute('data-disabled');
  });

  it('switches mode from the segmented control and reflects it on the shell root', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    // Build is disabled — clicking it must not change the mode.
    await user.click(screen.getByRole('radio', { name: /Build/ }));
    expect(screen.getByTestId('mode-probe')).toHaveTextContent('explore');
    expect(container.querySelector('.player-shell')).toHaveAttribute('data-player-mode', 'explore');
  });

  it('opens the inspector with the selected node\'s title when `selection` is set, and Esc closes it', async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.queryByRole('complementary', { name: 'Inspector' })).toBeNull();

    await user.click(screen.getByText('select api'));
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(within(inspector).getByText('API')).toBeTruthy();
    expect(within(inspector).getByText('server')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary', { name: 'Inspector' })).toBeNull();
  });

  it('closes the inspector from its own close button', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByText('select api'));
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    await user.click(within(inspector).getByRole('button', { name: 'Close inspector' }));
    expect(screen.queryByRole('complementary', { name: 'Inspector' })).toBeNull();
  });

  it('toggles the left rail with the top bar button and with mod+b', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    const body = () => container.querySelector('.player-body')!;
    expect(body()).toHaveAttribute('data-rail-open', 'true');

    await user.click(screen.getByRole('button', { name: 'Toggle left rail' }));
    expect(body()).toHaveAttribute('data-rail-open', 'false');

    await user.keyboard('{Meta>}b{/Meta}');
    expect(body()).toHaveAttribute('data-rail-open', 'true');
  });
});
