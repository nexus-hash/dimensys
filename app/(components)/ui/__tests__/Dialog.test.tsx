import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Dialog } from '../Dialog';

function Wrapper({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          onOpenChange(true);
        }}
      >
        Open
      </button>
      <Dialog
        title="Confirm kill"
        description="This stops the cache node."
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
        footer={<button>Confirm</button>}
      >
        <button>Body action</button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('traps focus inside the dialog while open', async () => {
    const user = userEvent.setup();
    render(<Wrapper onOpenChange={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // Tabbing repeatedly should never move focus outside the dialog.
    for (let i = 0; i < 10; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Wrapper onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
