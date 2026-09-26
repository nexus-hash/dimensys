import { notFound } from 'next/navigation';
import { DiagramPlayer } from '@/app/(components)/player';
import type { ViewData } from '@/app/(components)/player';

export const metadata = {
  title: 'Player skeleton — /dev/player',
  robots: { index: false, follow: false },
};

/** Hand-written stand-in for a view-data document, so the skeleton renders without synced output. */
const FIXTURE: ViewData = {
  fmt: 1,
  build: `sha256:${'0'.repeat(64)}`,
  id: 'dev-fixture',
  rev: 1,
  family: 'hld',
  head: { title: 'Player skeleton fixture', blurb: 'Fixture for the player skeleton.', grade: 'easy', labels: [] },
  needs: [],
  premises: [],
  refs: [],
  board: { size: [640, 360], blocks: [], wires: [] },
  spares: { blocks: [], wires: [] },
  pins: [],
  stories: [],
  plays: [],
  remedies: [],
  switches: [],
  gauges: [],
  calcs: [],
  drills: [],
  motifs: [],
  live: false,
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
