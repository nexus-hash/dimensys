import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { CalcPanel, heroResultId } from '../CalcPanel';
import { formatCalcValue, sliderStep, snapSliderValue } from '../calcFormat';
import { publishCalcReply } from '../../worker/calcResults';
import type { CalcPart, CalcView } from '../../types';
import { fakeBridge, pushFrame, renderLive } from './liveHarness';

const CALC: CalcView = {
  id: 'c1',
  md: 'cores = rps × ms ÷ 1000',
  sliders: [
    { id: 'req_rate', text: 'Requests / Sec', init: 4000, lo: 100, hi: 50000, suffix: 'req/sec' },
    { id: 'execution_time', text: 'Execution Latency', init: 20, lo: 5, hi: 200, suffix: 'ms' },
  ],
  results: [
    { id: 'cores', text: 'Cores needed', fmt: 'integer' },
    { id: 'pods', text: 'Pods (8 cores each)', fmt: 'integer', feeds: true },
  ],
};
const PART: CalcPart = { shape: 'calc', pane: 'operations', title: 'Compute Sizing Calculator', calc: 'c1', assumed: true };

describe('calcFormat', () => {
  it('formats each declared output format, and a missing value as a dash', () => {
    expect(formatCalcValue(80.4, 'integer')).toEqual({ value: '80', unit: '' });
    expect(formatCalcValue(2_500_000_000, 'bytes')).toEqual({ value: '2.5', unit: 'GB' });
    expect(formatCalcValue(512, 'bytes')).toEqual({ value: '512', unit: 'B' });
    expect(formatCalcValue(12_000, 'rps')).toEqual({ value: '12.0k', unit: 'rps' });
    expect(formatCalcValue(0.25, 'percent')).toEqual({ value: '25.0', unit: '%' });
    expect(formatCalcValue(1234.567, 'number')).toEqual({ value: '1,234.57', unit: '' });
    expect(formatCalcValue(undefined, 'number')).toEqual({ value: '—', unit: '' });
    expect(formatCalcValue(Number.NaN, 'integer')).toEqual({ value: '—', unit: '' });
  });

  it('derives a round slider step from the range unless one is given, and snaps values into range', () => {
    expect(sliderStep(100, 50000)).toBe(500);
    expect(sliderStep(5, 200)).toBe(2);
    expect(sliderStep(0, 1)).toBe(0.01);
    expect(sliderStep(0, 10, 0.5)).toBe(0.5);
    expect(snapSliderValue(4123, 100, 50000, 500)).toBe(4100);
    expect(snapSliderValue(99999, 100, 50000, 500)).toBe(50000);
    expect(snapSliderValue(123456, 1000, 1e9, 1, true)).toBe(123000);
  });

  it('the hero output is the first one that feeds the simulation', () => {
    expect(heroResultId(CALC)).toBe('pods');
    expect(heroResultId({ ...CALC, results: CALC.results.map((r) => ({ ...r, feeds: undefined })) })).toBe('cores');
  });
});

describe('CalcPanel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('previews through the worker without applying, and shows the outputs it answers', () => {
    const bridge = fakeBridge();
    const { store } = renderLive(<CalcPanel part={PART} calc={CALC} />, { status: 'ready', bridge });
    expect(screen.getByText('cores = rps × ms ÷ 1000')).toBeTruthy();
    expect(screen.getByText('4,000')).toBeTruthy();
    act(() => vi.advanceTimersByTime(200));
    expect(bridge.calc).toHaveBeenCalledWith('c1', { req_rate: 4000, execution_time: 20 }, true);
    const seq = bridge.calc.mock.results[0].value as number;
    // A reply to someone else's command is ignored.
    act(() => publishCalcReply(store, { seq: seq + 50, id: 'c1', outputs: { cores: 1, pods: 1 } }));
    expect(screen.queryByText('80')).toBeNull();
    act(() => publishCalcReply(store, { seq, id: 'c1', outputs: { cores: 80, pods: 10 } }));
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('→ Feeds the simulation')).toBeTruthy();
    expect(screen.getByText('Preview only until you apply it.')).toBeTruthy();
  });

  it('a slider move re-previews once it settles', () => {
    const bridge = fakeBridge();
    renderLive(<CalcPanel part={PART} calc={CALC} />, { status: 'ready', bridge });
    act(() => vi.advanceTimersByTime(200));
    const thumb = screen.getAllByRole('slider')[0];
    act(() => {
      thumb.focus();
      fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    });
    act(() => vi.advanceTimersByTime(50));
    expect(bridge.calc).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(200));
    expect(bridge.calc).toHaveBeenCalledTimes(2);
    // One step up from 4,000 on the 500-step grid that starts at 100.
    expect(bridge.calc.mock.calls[1][1].req_rate).toBe(4100);
  });

  it('Apply sends the values for real; once answered it reads as applied, until the run restarts', () => {
    const bridge = fakeBridge();
    const { store } = renderLive(<CalcPanel part={PART} calc={CALC} />, { status: 'ready', bridge });
    pushFrame(store, 5, {});
    act(() => screen.getByRole('button', { name: 'Apply to simulation' }).click());
    const call = bridge.calc.mock.calls.find((c) => c[2] !== true)!;
    expect(call).toEqual(['c1', { req_rate: 4000, execution_time: 20 }]);
    expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled();
    const seq = bridge.calc.mock.results[bridge.calc.mock.calls.indexOf(call)].value as number;
    act(() => publishCalcReply(store, { seq, id: 'c1', outputs: { cores: 80, pods: 10 } }));
    expect(screen.getByRole('button', { name: 'Applied' })).toBeDisabled();
    expect(screen.getByText('✓ Applied to the simulation')).toBeTruthy();
    // Reset: time goes backwards, the applied sizing is gone.
    pushFrame(store, 0.1, {});
    expect(screen.getByRole('button', { name: 'Apply to simulation' })).toBeEnabled();
  });

  it('a rejected command says so', () => {
    const bridge = fakeBridge();
    const { store } = renderLive(<CalcPanel part={PART} calc={CALC} />, { status: 'ready', bridge });
    act(() => vi.advanceTimersByTime(200));
    const seq = bridge.calc.mock.results[0].value as number;
    act(() => publishCalcReply(store, { seq, error: 'EXPR_UNBOUND' }));
    expect(screen.getByText('The simulation could not evaluate these values.')).toBeTruthy();
  });

  it('a calculator that feeds nothing has no Apply button', () => {
    const calc: CalcView = { ...CALC, results: CALC.results.map((r) => ({ ...r, feeds: undefined })) };
    renderLive(<CalcPanel part={PART} calc={calc} />, { status: 'ready', bridge: fakeBridge() });
    expect(screen.queryByRole('button', { name: /Apply/ })).toBeNull();
  });

  it('without a simulation the outputs stay empty and it says why', () => {
    renderLive(<CalcPanel part={PART} calc={CALC} />, { hasSimulation: false });
    expect(screen.getAllByText('—').length).toBe(2);
    expect(screen.getByRole('button', { name: 'Apply to simulation' })).toBeDisabled();
    expect(screen.getByText(/which this view does not have/)).toBeTruthy();
  });
});
