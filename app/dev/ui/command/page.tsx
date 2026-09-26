import { notFound } from 'next/navigation';
import { CommandGallery } from './CommandGallery';

export const metadata = {
  title: 'DS7 command palette — /dev/ui/command',
  robots: { index: false, follow: false },
};

/**
 * Living gallery for the command palette / shortcut registry (DS7): what's
 * currently registered, a demo scope you can toggle on and off, and
 * triggers for the palette and the `?` cheat sheet. Development only —
 * same 404-in-production gating as `/dev/ui`, `/dev/ui/canvas` and
 * `/dev/ui/data`. The palette itself is mounted once, app-wide, by
 * `CommandProvider` in the root layout — this page doesn't render its own.
 */
export default function DevUiCommandPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <CommandGallery />;
}
