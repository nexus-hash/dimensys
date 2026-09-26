import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs, TabsContent } from '../Tabs';

const items = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
];

function Wrapper({ onValueChange }: { onValueChange: (v: string) => void }) {
  const [value, setValue] = useState('one');
  return (
    <Tabs
      aria-label="Sections"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValueChange(v);
      }}
      items={items}
    >
      <TabsContent value="one">Panel one</TabsContent>
      <TabsContent value="two">Panel two</TabsContent>
      <TabsContent value="three">Panel three</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('activates the panel for the selected tab', () => {
    render(<Wrapper onValueChange={() => {}} />);
    expect(screen.getByText('Panel one')).toBeVisible();
  });

  it('moves selection with arrow keys and updates the active panel', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Wrapper onValueChange={onValueChange} />);

    screen.getByRole('tab', { name: 'One' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(onValueChange).toHaveBeenLastCalledWith('two');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Panel two')).toBeVisible();
  });

  it('End jumps to the last tab', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Wrapper onValueChange={onValueChange} />);

    screen.getByRole('tab', { name: 'One' }).focus();
    await user.keyboard('{End}');
    expect(onValueChange).toHaveBeenLastCalledWith('three');
  });
});
