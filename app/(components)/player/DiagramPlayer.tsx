import { PlayerIsland } from './PlayerIsland';
import { DrilldownBlueprint, subsystemLabelsById } from './blueprint';
import { PlayerShell, buildElementIndex, modeAvailability } from './shell';
import type { PlayerBootstrap, ViewData } from './types';

export interface DiagramPlayerProps {
  /** View-data slice, loaded server-side (T3.13 `loadPlayerDiagram`). `null` renders the unavailable state. */
  diagram: ViewData | null;
  /** Hashed worker bundle URL from the sync manifest; `null` when the synced output has no runtime. */
  runtimeUrl?: string | null;
  /** `full` = /solutions/[id]; `embed` / `hero` drop the rails (S4.3, S4.6). */
  variant?: 'full' | 'embed' | 'hero';
}

/** Static JSON route for the full view-data document (T3.13). */
export function diagramJsonUrl(diagram: Pick<ViewData, 'id' | 'build'>): string {
  return `/solutions/${encodeURIComponent(diagram.id)}/diagram.json?h=${encodeURIComponent(diagram.build.replace(/^sha256:/, '').slice(0, 16))}`;
}

/** Static route for the opaque sim payload the worker fetches itself (T3.13). `null` when the diagram doesn't simulate. */
export function simPayloadUrl(diagram: Pick<ViewData, 'id' | 'build' | 'live'>): string | null {
  if (!diagram.live) return null;
  return `/solutions/${encodeURIComponent(diagram.id)}/sim.bin?h=${encodeURIComponent(diagram.build.replace(/^sha256:/, '').slice(0, 16))}`;
}

export function toBootstrap(diagram: ViewData, runtimeUrl: string | null): PlayerBootstrap {
  return {
    diagramId: diagram.id,
    revision: diagram.rev,
    hash: diagram.build,
    diagramUrl: diagramJsonUrl(diagram),
    runtimeUrl,
    simUrl: simPayloadUrl(diagram),
    hasSimulation: diagram.live,
    canvas: diagram.board ? { w: diagram.board.size[0], h: diagram.board.size[1] } : { w: 0, h: 0 },
  };
}

/**
 * `<DiagramPlayer>`: a Server Component.
 *
 * Renders the frame server-side and hands a small serialisable bootstrap to
 * the one client boundary, `<PlayerIsland>`. The static SVG blueprint (T3.2),
 * every subsystem level included (T3.4's `<DrilldownBlueprint>`), goes in as
 * a server-rendered child, so a readable diagram needs no client JS and is
 * the LCP element; drilling into a subsystem is progressive enhancement on
 * top of that same markup. A diagram with no board yet (catalog-only)
 * renders a placeholder instead.
 */
export function DiagramPlayer({ diagram, runtimeUrl = null, variant = 'full' }: DiagramPlayerProps) {
  if (!diagram) {
    return (
      <section data-player-variant={variant} className="rounded-lg border border-line-hairline p-6 text-ink-secondary">
        <p role="status">This diagram isn&apos;t available.</p>
      </section>
    );
  }

  if (!diagram.board) {
    return (
      <section data-player-variant={variant} aria-label={diagram.head.title} className="rounded-lg border border-line-hairline">
        <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)}>
          <div className="p-6 text-ink-secondary">
            <p role="status">
              No diagram yet: <span className="text-ink-primary">{diagram.head.title}</span>
            </p>
          </div>
        </PlayerIsland>
      </section>
    );
  }

  const board = diagram.board;
  // No `className="w-full"` here: `StaticBlueprint`'s own `aspect-ratio` +
  // `max-width`/`max-height` need `width`/`height` left `auto` on both axes
  // to engage CSS's two-axis "shrink to fit, never upscale, preserve ratio"
  // sizing for a replaced-like box — an explicit `100%` on either axis would
  // make that axis definite and stop the *other* one being derived from it
  // when this is the more restrictive constraint (e.g. a short container).
  // A plain block box's default `width: auto` already fills its containing
  // block (the embed/hero, non-shell path below), and the shell's own
  // `.player-drill-level` centers a flex item sized the same way.
  const blueprint = <DrilldownBlueprint board={board} boardId={`blueprint-${diagram.id}`} rootLabel={diagram.head.title} />;

  // `embed`/`hero` (the home hero, a diagram embedded in a detail section)
  // drop the shell entirely — just the board and its overlay, no top bar,
  // rails or inspector frame.
  if (variant !== 'full') {
    return (
      <section data-player-variant={variant} aria-label={diagram.head.title} className="rounded-lg border border-line-hairline">
        <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)}>{blueprint}</PlayerIsland>
      </section>
    );
  }

  const labelsById = subsystemLabelsById(board);
  const elementIndex = buildElementIndex(board);
  const availability = modeAvailability(diagram);

  // A plain `<div>`, not a labelled `<section>`: an accessibly-named
  // `<section>` is itself a landmark ("region"), and `PlayerShell` already
  // renders its own top-level `<main aria-label>` — nesting that inside
  // another landmark is exactly what axe's `landmark-main-is-top-level`
  // flags. The embed/hero branch above has no `<main>` of its own, so it
  // keeps the labelled section as its one landmark.
  return (
    <div data-player-variant={variant} className="h-full">
      <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)}>
        <PlayerShell title={diagram.head.title} labelsById={labelsById} elementIndex={elementIndex} modeAvailability={availability}>
          {blueprint}
        </PlayerShell>
      </PlayerIsland>
    </div>
  );
}
