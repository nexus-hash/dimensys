import { PlayerIsland } from './PlayerIsland';
import { PlayerBlueprint } from './blueprint';
import { PlayerShell, buildElementIndex, modeAvailability } from './shell';
import { buildInspectorPanels } from './inspector/InspectorPanels';
import { buildTargetCatalog } from './breakit/catalog';
import { buildWalkthroughs } from './walkthrough/model';
import { buildWalkthroughNarration } from './walkthrough/narration';
import { buildRailData } from './rail/data';
import type { ReactNode } from 'react';
import type { PlayerBootstrap, ViewData } from './types';

export interface DiagramPlayerProps {
  /** View-data slice, loaded server-side (T3.13 `loadPlayerDiagram`). `null` renders the unavailable state. */
  diagram: ViewData | null;
  /** Hashed worker bundle URL from the sync manifest; `null` when the synced output has no runtime. */
  runtimeUrl?: string | null;
  /**
   * `full` = /solutions/[id]; `embed` / `hero` drop the rails (S4.3, S4.6).
   * `hero` is also a static preview: the sim and particles run, but there
   * are no zoom controls, gestures, hover or selection, and it sizes to a
   * fixed wide box (`.player-hero` in globals.css) instead of the board's
   * own aspect ratio.
   */
  variant?: 'full' | 'embed' | 'hero';
  /**
   * `hero` only: rendered right under the board, inside the player's client
   * boundary, so a client component there can read the live store (e.g. the
   * shared global-metrics feed).
   */
  heroFooter?: ReactNode;
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
 * the one client boundary, `<PlayerIsland>`. The static SVG blueprint (T3.2,
 * `<PlayerBlueprint>`: every node, framed groups included) goes in as a
 * server-rendered child, so a readable diagram needs no client JS and is
 * the LCP element; the camera and live layer are progressive enhancement on
 * top of that same markup. A diagram with no board yet (catalog-only)
 * renders a placeholder instead.
 */
export function DiagramPlayer({ diagram, runtimeUrl = null, variant = 'full', heroFooter }: DiagramPlayerProps) {
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
  // `.player-board-level` centers a flex item sized the same way.
  const blueprint = (
    <PlayerBlueprint board={board} boardId={`blueprint-${diagram.id}`} title={diagram.head.title} interactive={variant !== 'hero'} />
  );

  // The home hero: a fixed wide box the card frames (no border/radius of its
  // own), the board fitted inside it by the same camera fit the full player
  // uses, and nothing to click, drag, zoom or focus — a wheel over it
  // scrolls the page.
  if (variant === 'hero') {
    return (
      <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)} interactive={false}>
        <section data-player-variant={variant} aria-label={diagram.head.title} className="player-hero canvas-surface">
          {blueprint}
        </section>
        {heroFooter}
      </PlayerIsland>
    );
  }

  // `embed` (a diagram embedded in a detail section)
  // drop the shell entirely — just the board and its overlay, no top bar,
  // rails or inspector frame.
  //
  // `style={{ aspectRatio }}` gives this `<section>` itself a real height:
  // the board's own layers (`.player-board-level`/`.player-board-stage`,
  // then the absolutely-positioned `.relative.overflow-visible` aspect box)
  // are built for the full shell, where an ancestor (`PlayerShell`) supplies
  // a definite height for their `h-full` chain to resolve against. Outside
  // that shell there's no such ancestor, so without this the chain
  // collapses to a 0px-tall box and the absolutely-positioned board paints
  // over whatever sits below this section in normal flow — invisible while
  // nothing did, but a real bug once a caller puts visible content there. `overflow-hidden` is the same fix's second half: it
  // clips anything that still overshoots this now-correctly-sized box
  // instead of letting it bleed into siblings.
  if (variant !== 'full') {
    return (
      <section
        data-player-variant={variant}
        aria-label={diagram.head.title}
        className="canvas-surface overflow-hidden rounded-lg border border-line-hairline"
        style={{ aspectRatio: `${board.size[0]} / ${board.size[1]}` }}
      >
        <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)}>{blueprint}</PlayerIsland>
      </section>
    );
  }

  const elementIndex = buildElementIndex(board);
  const availability = modeAvailability(diagram);
  // Every node's/link's inspector body, rendered once here (server-side —
  // see `buildInspectorPanels`'s own doc comment) rather than fetched or
  // built client-side per selection.
  const panels = buildInspectorPanels(board, elementIndex, { switches: diagram.switches, calcs: diagram.calcs, knobs: diagram.knobs });

  // A plain `<div>`, not a labelled `<section>`: an accessibly-named
  // `<section>` is itself a landmark ("region"), and `PlayerShell` already
  // renders its own top-level `<main aria-label>` — nesting that inside
  // another landmark is exactly what axe's `landmark-main-is-top-level`
  // flags. The embed/hero branches above have no `<main>` of their own, so they
  // keep the labelled section as their one landmark.
  return (
    <div data-player-variant={variant} className="h-full">
      <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)}>
        <PlayerShell
          title={diagram.head.title}
          elementIndex={elementIndex}
          modeAvailability={availability}
          panels={panels}
          gauges={diagram.gauges}
          needs={diagram.needs}
          kit={diagram.kit}
          remedies={diagram.remedies}
          catalog={buildTargetCatalog(board)}
          switches={diagram.switches}
          walkthroughs={buildWalkthroughs(diagram)}
          narration={buildWalkthroughNarration(diagram)}
          rail={buildRailData(diagram)}
          plays={diagram.plays}
        >
          {blueprint}
        </PlayerShell>
      </PlayerIsland>
    </div>
  );
}
