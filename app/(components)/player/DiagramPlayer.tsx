import { PlayerIsland } from './PlayerIsland';
import { DrilldownBlueprint } from './blueprint';
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

  return (
    <section data-player-variant={variant} aria-label={diagram.head.title} className="rounded-lg border border-line-hairline">
      <PlayerIsland bootstrap={toBootstrap(diagram, runtimeUrl)}>
        {/* TODO(T3.16): player shell (top bar, rails, inspector, timeline frame). */}
        {diagram.board ? (
          <DrilldownBlueprint
            board={diagram.board}
            boardId={`blueprint-${diagram.id}`}
            rootLabel={diagram.head.title}
            className="w-full"
          />
        ) : (
          <div className="p-6 text-ink-secondary">
            <p role="status">
              No diagram yet: <span className="text-ink-primary">{diagram.head.title}</span>
            </p>
          </div>
        )}
      </PlayerIsland>
    </section>
  );
}
