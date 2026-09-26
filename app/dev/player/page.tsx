import { notFound } from 'next/navigation';
import { DiagramPlayer } from '@/app/(components)/player';
import type { ViewData } from '@/app/(components)/player';

export const metadata = {
  title: 'Player skeleton — /dev/player',
  robots: { index: false, follow: false },
};

/** Hand-written stand-in for a view-data document, so the skeleton renders without synced output. */
const FIXTURE: ViewData = {
  id: 'dev-fixture',
  build: { version: '3.0.0', hash: `sha256:${'0'.repeat(64)}`, builtAt: '2026-09-26T00:00:00.000Z' },
  layouts: { desktop: { canvas: { w: 640, h: 360 }, nodes: {}, links: {} } },
  metadata: { title: 'Player skeleton fixture', revision: 1 },
  walkthroughStates: {},
  hasSimulation: false,
};

/**
 * T3.1 skeleton check: the server `<DiagramPlayer>` → client `<PlayerIsland>`
 * boundary renders. Development only — 404s in production, same as `/dev/ui`.
 */
export default function DevPlayerPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <DiagramPlayer diagram={FIXTURE} />
      <DiagramPlayer diagram={null} />
    </main>
  );
}
