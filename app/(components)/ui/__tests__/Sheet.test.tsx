import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BottomSheet, DEFAULT_SNAP_POINTS } from '../Sheet';

describe('BottomSheet', () => {
  it('snaps between 12/50/92% via the keyboard on the grab handle', async () => {
    const user = userEvent.setup();
    const onSnapIndexChange = vi.fn();

    render(
      <BottomSheet
        open
        title="Narration"
        snapIndex={1}
        onSnapIndexChange={onSnapIndexChange}
        snapPoints={[...DEFAULT_SNAP_POINTS]}
      >
        <p>Body</p>
      </BottomSheet>,
    );

    const handle = screen.getByRole('slider', { name: 'Resize sheet' });
    expect(handle).toHaveAttribute('aria-valuenow', '1');
    expect(handle).toHaveAttribute('aria-valuetext', '50% of screen');

    handle.focus();
    await user.keyboard('{ArrowUp}');
    expect(onSnapIndexChange).toHaveBeenLastCalledWith(2);

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    expect(onSnapIndexChange).toHaveBeenLastCalledWith(0);

    // Clamped at the bottom.
    await user.keyboard('{ArrowDown}');
    expect(onSnapIndexChange).toHaveBeenLastCalledWith(0);

    await user.keyboard('{End}');
    expect(onSnapIndexChange).toHaveBeenLastCalledWith(DEFAULT_SNAP_POINTS.length - 1);

    await user.keyboard('{Home}');
    expect(onSnapIndexChange).toHaveBeenLastCalledWith(0);
  });
});
