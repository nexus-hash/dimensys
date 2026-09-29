import { describe, it, expect } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeToggle } from '../TradeToggle';
import { activeOptionId, defaultOptionId, tradeRows } from '../tradeState';
import type { SwitchView, TradePart } from '../../types';
import { fakeBridge, renderLive } from './liveHarness';

const SW: SwitchView = {
  id: 'write-consistency',
  text: 'Write consistency',
  opts: [
    { id: 'quorum', text: 'LOCAL_QUORUM', on: true, axes: [['Consistency', 9], ['Speed', 5]], plus: 'No stale reads.', minus: 'Slower.' },
    { id: 'one', text: 'ONE', axes: [['Consistency', 4], ['Speed', 9], ['Cost', 7]], plus: 'Fastest.', minus: 'Stale reads.' },
  ],
};
const PART: TradePart = { shape: 'trade', pane: 'operations', title: 'Write consistency', axes: [], picks: [], flip: SW.id };

describe('tradeState', () => {
  it('the default is the option marked on, else the first', () => {
    expect(defaultOptionId(SW)).toBe('quorum');
    expect(defaultOptionId({ ...SW, opts: SW.opts.map((o) => ({ ...o, on: undefined })) })).toBe('quorum');
    expect(defaultOptionId({ ...SW, opts: [SW.opts[1], { ...SW.opts[0], on: true }] })).toBe('quorum');
  });

  it('the active option is the last logged flip of this switch; other tools, switches and unknown options are ignored', () => {
    expect(activeOptionId([], SW)).toBe('quorum');
    expect(
      activeOptionId(
        [
          [1, 'toggle', SW.id, 'one'],
          [2, 'kill', 'db', null],
          [3, 'toggle', 'other', 'quorum'],
          [4, 'toggle', SW.id, 'bogus'],
        ],
        SW,
      ),
    ).toBe('one');
    expect(activeOptionId([[1, 'toggle', SW.id, 'one'], [2, 'toggle', SW.id, 'quorum']], SW)).toBe('quorum');
  });

  it('rows cover every axis any option rates, null where an option does not', () => {
    expect(tradeRows(SW)).toEqual([
      { label: 'Consistency', scores: [9, 4] },
      { label: 'Speed', scores: [5, 9] },
      { label: 'Cost', scores: [null, 7] },
    ]);
  });
});

describe('TradeToggle', () => {
  it('shows every option, the default active, its pros and cons, and a table of scores', () => {
    renderLive(<TradeToggle part={PART} sw={SW} />, { status: 'ready', bridge: fakeBridge() });
    expect(screen.getByRole('radio', { name: 'LOCAL_QUORUM' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'ONE' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('No stale reads.')).toBeTruthy();
    expect(screen.getByText('View as table')).toBeTruthy();
    expect(document.querySelector('[data-trade-dot="quorum"][data-active="true"]')).not.toBeNull();
  });

  it('a pick is sent to the live run as a switch flip, and the log decides what is active', async () => {
    const bridge = fakeBridge();
    const { store } = renderLive(<TradeToggle part={PART} sw={SW} />, { status: 'ready', bridge });
    await userEvent.click(screen.getByRole('radio', { name: 'ONE' }));
    expect(bridge.applyAction).toHaveBeenCalledTimes(1);
    expect(bridge.applyAction).toHaveBeenCalledWith('toggle', SW.id, 'one');
    // Optimistic until the echo arrives…
    expect(screen.getByRole('radio', { name: 'ONE' })).toHaveAttribute('aria-checked', 'true');
    // …then read from the log.
    act(() => store.setState({ actions: [[1.2, 'toggle', SW.id, 'one']] }));
    expect(screen.getByRole('radio', { name: 'ONE' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Fastest.')).toBeTruthy();
    expect(document.querySelector('[data-trade-dot="one"][data-active="true"]')).not.toBeNull();

    // Revertible: back to the default through the same path.
    await userEvent.click(screen.getByRole('button', { name: 'Back to LOCAL_QUORUM' }));
    expect(bridge.applyAction).toHaveBeenLastCalledWith('toggle', SW.id, 'quorum');

    // Reset clears the log: the default is active again.
    act(() => store.setState({ actions: [] }));
    expect(screen.getByRole('radio', { name: 'LOCAL_QUORUM' })).toHaveAttribute('aria-checked', 'true');
  });

  it('re-picking the active option sends nothing', async () => {
    const bridge = fakeBridge();
    renderLive(<TradeToggle part={PART} sw={SW} />, { status: 'ready', bridge });
    await userEvent.click(screen.getByRole('radio', { name: 'LOCAL_QUORUM' }));
    expect(bridge.applyAction).not.toHaveBeenCalled();
  });

  it('while the simulation loads the control is disabled', () => {
    renderLive(<TradeToggle part={PART} sw={SW} />, { status: 'loading' });
    expect(screen.getByRole('radio', { name: 'ONE' })).toBeDisabled();
    expect(screen.getByText('Available once the simulation starts.')).toBeTruthy();
  });

  it('without a simulation it still compares the options locally', async () => {
    renderLive(<TradeToggle part={PART} sw={SW} />, { hasSimulation: false });
    await userEvent.click(screen.getByRole('radio', { name: 'ONE' }));
    expect(screen.getByRole('radio', { name: 'ONE' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Fastest.')).toBeTruthy();
  });
});
