import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { PlayerBreadcrumbs } from '../PlayerBreadcrumbs';
import { PlayerStoreProvider, usePlayerStore, usePlayerStoreApi } from '../../store/PlayerStoreProvider';
import { enterSubsystem } from '../../store/playerStore';
import type { PlayerBootstrap } from '../../types';

const boot: PlayerBootstrap = {
  diagramId: 'url-shortener',
  revision: 1,
  hash: 'sha256:abc',
  diagramUrl: '/x',
  hasSimulation: false,
  runtimeUrl: null,
  simUrl: null,
  canvas: { w: 0, h: 0 },
};

function DrillProbe() {
  const drill = usePlayerStore((s) => s.drill);
  return <div data-testid="drill-probe">{drill.join('>')}</div>;
}

function EnterButton({ id }: { id: string }) {
  const store = usePlayerStoreApi();
  return (
    <button type="button" onClick={() => store.setState((s) => enterSubsystem(s, id))}>
      enter {id}
    </button>
  );
}

describe('PlayerBreadcrumbs', () => {
  it('shows the trail once drilled in, and a breadcrumb click jumps back via the store', async () => {
    const user = userEvent.setup();
    render(
      <PlayerStoreProvider bootstrap={boot}>
        <DrillProbe />
        <EnterButton id="kgs-service" />
        <PlayerBreadcrumbs rootLabel="URL shortener" labelsById={{ 'kgs-service': 'Key Generation Service' }} />
      </PlayerStoreProvider>,
    );

    expect(screen.queryByRole('navigation', { name: 'Subsystem breadcrumbs' })).toBeNull();

    await user.click(screen.getByText('enter kgs-service'));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('kgs-service');

    const nav = within(screen.getByRole('navigation', { name: 'Subsystem breadcrumbs' }));
    expect(nav.getByText('URL shortener')).toBeTruthy();
    expect(nav.getByText('Key Generation Service')).toHaveAttribute('aria-current', 'location');

    await user.click(nav.getByRole('button', { name: 'URL shortener' }));
    expect(screen.getByTestId('drill-probe')).toHaveTextContent('');
  });
});
