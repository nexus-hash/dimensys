import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedControl } from '../SegmentedControl';

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
];

function Wrapper({ onValueChange }: { onValueChange: (v: string) => void }) {
  const [value, setValue] = useState('a');
  return (
    <SegmentedControl
      aria-label="Mode"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValueChange(v);
      }}
      options={options}
    />
  );
}

describe('SegmentedControl', () => {
  it('moves selection with arrow keys (WAI-ARIA radiogroup pattern)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Wrapper onValueChange={onValueChange} />);

    const a = screen.getByRole('radio', { name: 'A' });
    a.focus();
    expect(a).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenLastCalledWith('c');

    await user.keyboard('{ArrowLeft}');
    expect(onValueChange).toHaveBeenLastCalledWith('b');
  });

  it('skips disabled options', () => {
    render(
      <SegmentedControl
        aria-label="Mode"
        value="a"
        onValueChange={() => {}}
        options={[...options, { value: 'd', label: 'D', disabled: true }]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'D' })).toBeDisabled();
  });
});
