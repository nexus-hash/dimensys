import Link from 'next/link';
import {
  ArrowRightIcon,
  Button,
  CheckIcon,
  ExternalLinkIcon,
  PauseIcon,
  PowerIcon,
  Tooltip,
  TrendingUpIcon,
} from '@/app/(components)/ui';
import { DiagramPlayer } from '@/app/(components)/player';
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
 * "Kill the cache" / "10× traffic" and the meltdown they trigger, the pause
 * control, "Replay tour" and the metric strip's live numbers are not wired
 * yet. Every one of those slots is visible, `aria-disabled`, tooltipped
 * "coming soon" and documented in `home/slots.ts` rather than faked or
 * hidden.
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

              <DiagramPlayer diagram={diagram} runtimeUrl={diagram.live ? runtimeUrl : null} variant="hero" />

              {/* Metric strip — "—" until wired (home/slots.ts: hero-hud). */}
              <div
                data-slot="hero-hud"
                className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-line-hairline px-3.5 py-3 font-mono text-[14px] font-semibold tabular-nums text-ink-primary"
              >
                <span className="sr-only">Live metrics, coming soon:</span>
                <span className="inline-flex items-center gap-1.5">
                  p99 <span>—</span>
                  <small className="text-[12px] font-medium text-ink-muted">ms</small>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  err <span>—</span>
                  <small className="text-[12px] font-medium text-ink-muted">%</small>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span>—</span>
                  <small className="text-[12px] font-medium text-ink-muted">rps</small>
                </span>
                <small className="ml-auto text-[12px] font-medium text-ink-muted">retries —</small>
              </div>

              {/* Status line. */}
              <div className="mx-3.5 mb-3 flex min-h-16 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-line-hairline bg-surface-sunken px-3 py-2.5">
                <CheckIcon aria-hidden className="h-3.5 w-3.5 flex-none text-brand-ink" />
                <p className="min-w-0 flex-[1_1_200px] text-[14px] leading-[1.45] text-ink-primary">
                  Healthy at baseline. Your turn: kill the cache or send 10× traffic.
                </p>
                <Tooltip content="Replay the tour — coming soon">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-slot="hero-replay-tour"
                    aria-disabled="true"
                    className="flex-none"
                  >
                    Replay tour
                  </Button>
                </Tooltip>
              </div>

              {/* Break-it actions. */}
              <div className="flex flex-wrap gap-2 px-3.5 pb-3.5 max-sm:[&>*]:flex-auto">
                <Tooltip content="Kill the cache — coming soon">
                  <Button type="button" variant="danger" data-slot="hero-kill-cache" aria-disabled="true">
                    <PowerIcon />
                    Kill the cache
                  </Button>
                </Tooltip>
                <Tooltip content="10× traffic — coming soon">
                  <Button type="button" variant="glass" data-slot="hero-10x-traffic" aria-disabled="true">
                    <TrendingUpIcon />
                    10× traffic
                  </Button>
                </Tooltip>
              </div>
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
