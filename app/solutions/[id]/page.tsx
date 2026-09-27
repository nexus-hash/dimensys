import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '@/app/(components)/navbar/Navbar';
import Footer from '@/app/(components)/footer/Footer';
import { DiagramPlayer } from '@/app/(components)/player';
import { listDiagramIds, loadPlayerDiagram, loadRuntimeUrl } from '@/app/(server)/engine/publicData';

/**
 * `/solutions/[id]` (T3.13): the hand-written replacement for the old
 * TSX-codegen route (`scripts/sync-engine.js` copying `dist/app/solutions/…`
 * from the engine's `manifest.pages[]`). Fully static — every id from the
 * synced manifest is prerendered at build time; `dynamicParams = false`
 * means any other id 404s with no runtime `fs` access.
 *
 * A catalog entry can be in the manifest's `diagrams[]` list without a
 * `board` yet (an unwritten/`planned` diagram — see `catalog.json`
 * `lifecycle`): `generateStaticParams` still includes it, so it gets a real
 * static page, and `<DiagramPlayer>` already renders a "not available yet"
 * placeholder for `diagram.board === undefined` (see `DiagramPlayer.tsx`).
 * That is this app's "coming soon" answer, chosen over a 404 so a shared
 * link to a planned diagram (from the problems page, search, or the
 * catalog) lands on a real page describing what it is instead of an error.
 * An id absent from the manifest entirely (never authored, or a typo) still
 * 404s via `dynamicParams = false`.
 */
export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const ids = await listDiagramIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const diagram = await loadPlayerDiagram(id);
  if (!diagram) notFound();

  const title = `${diagram.head.title} — Dimensys`;
  const description = diagram.head.blurb;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function SolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [diagram, runtimeUrl] = await Promise.all([loadPlayerDiagram(id), loadRuntimeUrl()]);
  if (!diagram) notFound();

  // A diagram with a board gets the full-screen player shell (T3.16):
  // the shell's own 48px top bar replaces the site nav/footer entirely —
  // nothing else may share the viewport with the diagram. A
  // catalog-only "planned" diagram has no player to speak of yet, so it
  // keeps the ordinary marketing chrome around its "coming soon" notice.
  if (!diagram.board) {
    return (
      <div className="flex min-h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-24 pb-20">
          <DiagramPlayer diagram={diagram} runtimeUrl={null} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-light-primary dark:bg-dark-primary font-sans">
      <DiagramPlayer diagram={diagram} runtimeUrl={diagram.live ? runtimeUrl : null} />
    </div>
  );
}
