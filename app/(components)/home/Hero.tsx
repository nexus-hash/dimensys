import Link from 'next/link';
import { Button, Pill, Tooltip } from '@/app/(components)/ui';
import { DiagramPlayer } from '@/app/(components)/player';
import { loadPlayerDiagram, loadRuntimeUrl } from '@/app/(server)/engine/publicData';

/** The diagram the hero embeds, running at its healthy baseline. */
export const HERO_DIAGRAM_ID = 'url-shortener';

/** HUD strip metrics shown in the hero card header. Every
 *  value is "—" until T3.8's metrics hook reaches the hero — see
 *  `home/slots.ts` (`hero-hud`). Never a fake number. */
const HERO_HUD_METRICS = [
  { label: 'p99' },
  { label: 'err' },
  { label: 'rps' },
  { label: 'retries' },
] as const;

/**
 * Home hero. The headline is the LCP element: it's plain server-rendered
 * text, above and outside the player markup, so it paints before any
 * diagram data or client JS is involved. `<DiagramPlayer variant="hero">`
 * server-renders the static board next to it (also no JS required to see
 * it); the one client boundary inside it (`PlayerIsland` -> `InteractiveLayer`)
 * mounts and fetches the worker/sim payload after that, never blocking
 * first paint. The hero variant already drops the shell's zoom cluster,
 * HUD bands and top bar (see `DiagramPlayer`'s own `variant` doc) — the
 * board itself fills this card with no further chrome from the player.
 *
 * "Kill the cache" / "10x traffic" and the meltdown they trigger, the pause
 * control and the HUD strip's live numbers are not wired yet. Every one of
 * those slots is visible, `aria-disabled`, tooltipped "coming soon" and
 * documented in `home/slots.ts` rather than faked or hidden.
 */
export async function Hero() {
  const [diagram, runtimeUrl] = await Promise.all([loadPlayerDiagram(HERO_DIAGRAM_ID), loadRuntimeUrl()]);

  return (
    <section className="w-full pb-16 pt-28 sm:pt-32">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-12">
        <div className="flex flex-col gap-6">
          <h1
            id="home-heading"
            className="text-[clamp(2.25rem,4vw+1.25rem,4.5rem)] font-bold leading-[1.05] tracking-tight text-ink-primary"
          >
            Step inside
            <br />
            <span className="whitespace-nowrap bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">
              real systems.
            </span>
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
              {/* No fake "#42": Daily doesn't exist yet (home/slots.ts / T3.9). */}
              <Link href="/daily">Today&apos;s outage</Link>
            </Button>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-signal-ok" />
              Computed live in your browser, every tick. It&apos;s a model, not a video
            </span>
            <span aria-hidden>·</span>
            <Link href={`/solutions/${HERO_DIAGRAM_ID}`} className="text-brand-ink hover:text-ink-primary">
              see assumptions
            </Link>
          </p>
        </div>

        <div className="w-full">
          {diagram ? (
            <div className="canvas-surface overflow-hidden rounded-card border border-line-hairline">
              {/* Header: live status, speed readout, pause + open-in-player. */}
              <div className="flex items-center justify-between gap-2 border-b border-line-hairline px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Pill variant="ok" icon={<span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-signal-ok" />}>
                    LIVE
                  </Pill>
                  <span className="truncate font-mono text-label text-ink-secondary">{HERO_DIAGRAM_ID}</span>
                </div>
                <div className="flex flex-none items-center gap-1">
                  <Tooltip content="Play / pause — coming soon">
                    <span
                      data-slot="hero-pause"
                      aria-disabled="true"
                      aria-label="Simulated at 1×. Pause — coming soon"
                      className="inline-flex h-7 items-center gap-1.5 rounded-control px-2 font-mono text-[12px] text-ink-muted"
                    >
                      <PauseIcon />
                      <span data-slot="hero-speed">simulated · 1×</span>
                    </span>
                  </Tooltip>
                  <Tooltip content="Open in the full player">
                    <Link
                      href={`/solutions/${HERO_DIAGRAM_ID}`}
                      aria-label="Open in the full player"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-glass hover:text-ink-primary"
                    >
                      <OpenIcon />
                    </Link>
                  </Tooltip>
                </div>
              </div>

              {/* Board: fills the card, no zoom cluster / HUD bands from the player itself
                  (see `DiagramPlayer`'s own `aspectRatio` fix for the embed/hero variant). */}
              <DiagramPlayer diagram={diagram} runtimeUrl={diagram.live ? runtimeUrl : null} variant="hero" />

              {/* HUD strip — "—" until wired (home/slots.ts: hero-hud). */}
              <div
                data-slot="hero-hud"
                className="grid grid-cols-4 gap-2 border-t border-line-hairline px-3 py-2 font-mono text-label text-ink-secondary"
              >
                {HERO_HUD_METRICS.map((metric) => (
                  <span key={metric.label} className="flex flex-col items-center gap-0.5">
                    <span className="text-ink-muted">{metric.label}</span>
                    <span className="tabular-nums text-ink-primary">—</span>
                  </span>
                ))}
              </div>

              {/* Status line + actions. */}
              <div className="flex flex-col gap-2 border-t border-line-hairline px-3 py-2.5">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-secondary">
                  Healthy at baseline. Your turn: kill the cache or send 10× traffic.
                  <Tooltip content="Replay the caption tour — coming soon">
                    <span
                      data-slot="hero-replay-tour"
                      aria-disabled="true"
                      aria-label="Replay tour — coming soon"
                      className="text-brand-ink"
                    >
                      Replay tour
                    </span>
                  </Tooltip>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Tooltip content="Kill the cache — coming soon">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      data-slot="hero-kill-cache"
                      aria-disabled="true"
                    >
                      Kill the cache
                    </Button>
                  </Tooltip>
                  <Tooltip content="10× traffic — coming soon">
                    <Button
                      type="button"
                      variant="glass"
                      size="sm"
                      data-slot="hero-10x-traffic"
                      aria-disabled="true"
                    >
                      10× traffic
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ) : (
            <div className="canvas-surface rounded-card border border-line-hairline p-6 text-ink-secondary">
              <p role="status">The live diagram isn&apos;t available right now.</p>
            </div>
          )}
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

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="h-3 w-3 flex-none"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function OpenIcon() {
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
      <path d="M14 4h6v6M20 4l-9 9M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
