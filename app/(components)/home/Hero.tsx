import Link from 'next/link';
import {
  ArrowRightIcon,
  Button,
  ExternalLinkIcon,
  PauseIcon,
  Tooltip,
} from '@/app/(components)/ui';
import { DiagramPlayer } from '@/app/(components)/player';
import { HeroMetricStrip } from './HeroMetricStrip';
import { HeroBreakActions } from './HeroBreakActions';
import { loadPlayerDiagram, loadRuntimeUrl } from '@/app/(server)/engine/publicData';

/** The diagram the hero embeds, running at its healthy baseline. */
export const HERO_DIAGRAM_ID = 'url-shortener';

/**
 * Home hero. The headline is the LCP element: it's plain server-rendered
 * text, above and outside the player markup, so it paints before any
 * diagram data or client JS is involved. `<DiagramPlayer variant="hero">`
 * server-renders the static board next to it (also no JS required to see
 * it); the one client boundary inside it mounts and fetches the worker/sim
 * payload after that, never blocking first paint. The hero variant is a
 * static preview: particles and live health run, but it has no zoom
 * controls, gestures, hover or selection, and a wheel over it scrolls the
 * page.
 *
 * Layout: a two-column grid on desktop (copy, then the live card), one
 * column below 1024px, and at phone width the copy block dissolves
 * (`display: contents`) so the card can sit between the subhead and the
 * CTAs.
 *
 * The metric strip under the board reads the live global-metrics feed
 * (`HeroMetricStrip`). "Kill the cache" / "10× traffic" run the same
 * worker actions as the full player's Break it tools (`HeroBreakActions`,
 * inside the player's client boundary so it reaches the hero's own run).
 * The pause control and "Replay tour" are not wired yet: those slots are
 * visible, `aria-disabled`, tooltipped "coming soon" and documented in
 * `home/slots.ts` rather than faked or hidden.
 */
export async function Hero() {
  const [diagram, runtimeUrl] = await Promise.all([loadPlayerDiagram(HERO_DIAGRAM_ID), loadRuntimeUrl()]);

  return (
    <section className="w-full">
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-6 px-4 pb-10 pt-[84px] sm:gap-8 sm:px-6 sm:pb-[72px] sm:pt-[100px] lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.3fr)] lg:gap-12 lg:pt-[116px]">
        <div className="max-sm:contents">
          <h1
            id="home-heading"
            className="text-[44px] font-bold leading-none tracking-[-0.03em] text-balance text-ink-primary max-sm:order-1 sm:text-[clamp(40px,8vw,72px)] lg:text-[clamp(44px,4.2vw,80px)]"
          >
            Step inside{' '}
            <span className="block bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">
              real&nbsp;systems.
            </span>
          </h1>
          <p className="mt-4 max-w-[30em] text-[16px] leading-[1.6] text-ink-secondary max-sm:order-2 sm:mt-6 sm:text-[18px]">
            Real architectures, running live in your browser. Watch them run, feel them strain, break them, and fix
            them.
          </p>
          <div className="flex flex-wrap gap-3 max-sm:order-4 sm:mt-8 max-sm:[&>*]:flex-auto">
            <Button asChild variant="primary" size="lg">
              <Link href={`/solutions/${HERO_DIAGRAM_ID}`}>
                Start breaking things
                <ArrowRightIcon />
              </Link>
            </Button>
            {/* No puzzle number: Daily isn't built yet (home/slots.ts). */}
            <Button asChild variant="glass" size="lg" className="text-brand-ink">
              <Link href="/daily">Today&apos;s outage</Link>
            </Button>
          </div>
          <p className="max-w-[34em] font-mono text-[12px] font-medium leading-[1.6] text-ink-muted max-sm:order-5 sm:mt-7">
            <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-signal-ok align-[1px]" />
            Computed live in your browser, every tick. It&apos;s a model, not a video ·{' '}
            <Link href={`/solutions/${HERO_DIAGRAM_ID}`} className="text-brand-ink underline underline-offset-[3px] hover:text-ink-primary">
              see assumptions
            </Link>
          </p>
        </div>

        <div className="min-w-0 max-sm:order-3" data-hero-card>
          {diagram ? (
            <div className="overflow-hidden rounded-[18px] border border-line-strong bg-surface-raised shadow-elevation-2">
              {/* Header: live status, speed readout, pause + open-in-player. */}
              <div className="flex h-11 items-center gap-2.5 border-b border-line-hairline pl-3.5 pr-3 font-mono text-[12px] font-medium text-ink-secondary">
                <span aria-hidden className="live-dot" />
                <b className="font-semibold text-ink-primary">LIVE</b>
                <span className="min-w-0 truncate">· {HERO_DIAGRAM_ID}</span>
                <span data-slot="hero-speed" className="ml-auto whitespace-nowrap text-ink-muted">
                  <span className="max-sm:hidden">simulated · </span>1×
                </span>
                <div className="-mr-1 flex flex-none items-center">
                  <Tooltip content="Pause — coming soon">
                    <button
                      type="button"
                      data-slot="hero-pause"
                      aria-disabled="true"
                      aria-label="Pause the simulation — coming soon"
                      className="inline-grid h-7 w-7 place-items-center rounded-control text-ink-secondary transition-colors duration-micro hover:bg-surface-glass hover:text-ink-primary"
                    >
                      <PauseIcon className="h-[18px] w-[18px]" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Open in the full simulator">
                    <Link
                      href={`/solutions/${HERO_DIAGRAM_ID}`}
                      aria-label="Open in the full simulator"
                      className="inline-grid h-7 w-7 place-items-center rounded-control text-ink-secondary transition-colors duration-micro hover:bg-surface-glass hover:text-ink-primary"
                    >
                      <ExternalLinkIcon className="h-[18px] w-[18px]" />
                    </Link>
                  </Tooltip>
                </div>
              </div>

              <DiagramPlayer
                diagram={diagram}
                runtimeUrl={diagram.live ? runtimeUrl : null}
                variant="hero"
                heroFooter={
                  <>
                    <HeroMetricStrip />
                    <HeroBreakActions
                      killTarget={diagram.kit?.chips.find((c) => c.verb === 'kill')?.el ?? null}
                      spike={diagram.kit?.chips.find((c) => c.verb === 'spike')?.amt ?? 10}
                    />
                  </>
                }
              />

            </div>
          ) : (
            <div className="rounded-[18px] border border-line-strong bg-surface-raised p-6 text-ink-secondary">
              <p role="status">The live diagram isn&apos;t available right now.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
