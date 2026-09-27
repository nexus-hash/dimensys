import Link from 'next/link';
import { Button } from '@/app/(components)/ui';
import { DiagramPlayer } from '@/app/(components)/player';
import { loadPlayerDiagram, loadRuntimeUrl } from '@/app/(server)/engine/publicData';

/** The diagram the hero embeds, running at its healthy baseline (S4.6a). */
export const HERO_DIAGRAM_ID = 'url-shortener';

/**
 * Home hero (S4.6a). The headline is the LCP element: it's plain server-
 * rendered text, above and outside the player markup, so it paints before
 * any diagram data or client JS is involved. `<DiagramPlayer variant="hero">`
 * server-renders the static board next to it (also no JS required to see
 * it); the one client boundary inside it (`PlayerIsland` -> `InteractiveLayer`)
 * mounts and fetches the worker/sim payload after that, never blocking
 * first paint.
 *
 * "Kill the cache" / "10x traffic" and the meltdown they trigger are a
 * later task (Break It on the hero). Nothing fakes that here — the slot
 * below the board is intentionally empty until that task fills it.
 */
export async function Hero() {
  const [diagram, runtimeUrl] = await Promise.all([loadPlayerDiagram(HERO_DIAGRAM_ID), loadRuntimeUrl()]);

  return (
    <section className="w-full pb-16 pt-28 sm:pt-32">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-12">
        <div className="flex flex-col gap-6">
          <h1 id="home-heading" className="text-display sm:text-display-xl text-ink-primary">
            Step inside{' '}
            <span className="bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">real systems.</span>
          </h1>
          <p className="max-w-lg text-body-lg text-ink-secondary">
            Real architectures, running live in your browser. Watch them run, feel them strain, break them, and fix
            them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href={`/solutions/${HERO_DIAGRAM_ID}`}>
                Start breaking things
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link href="/problems">Explore all systems</Link>
            </Button>
          </div>
          <p className="flex items-center gap-2 text-caption text-ink-muted">
            <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-signal-ok" />
            Computed live in your browser, every tick. It&apos;s a model, not a video.
          </p>
        </div>

        <div className="w-full">
          {diagram ? (
            <DiagramPlayer diagram={diagram} runtimeUrl={diagram.live ? runtimeUrl : null} variant="hero" />
          ) : (
            <div className="canvas-surface rounded-card border border-line-hairline p-6 text-ink-secondary">
              <p role="status">The live diagram isn&apos;t available right now.</p>
            </div>
          )}
          {/*
            Slot for the hero's "Kill the cache" / "10x traffic" actions and
            the meltdown they trigger (Break It on the hero, a later task).
            Deliberately empty: no visible placeholder, no fake button.
          */}
        </div>
      </div>
    </section>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4 flex-none"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
