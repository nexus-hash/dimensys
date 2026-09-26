import { PlayerIsland } from './PlayerIsland';
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

export function toBootstrap(diagram: ViewData, runtimeUrl: string | null): PlayerBootstrap {
  return {
    diagramId: diagram.id,
    revision: diagram.rev,
    hash: diagram.build,
    diagramUrl: diagramJsonUrl(diagram),
    runtimeUrl,
    hasSimulation: diagram.live,
    canvas: diagram.board ? { w: diagram.board.size[0], h: diagram.board.size[1] } : { w: 0, h: 0 },
  };
}

/**
 * `<DiagramPlayer>`: a Server Component.
 *
 * Renders the frame server-side and hands a small serialisable bootstrap to
 * the one client boundary, `<PlayerIsland>`. The static SVG blueprint (T3.2)
 * goes in as a server-rendered child, so a readable diagram needs no client
 * JS and is the LCP element.
 *
 * Skeleton (T3.1): renders a "not implemented" notice only.
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
        {/* TODO(T3.2): <StaticBlueprint board={diagram.board} /> server-rendered here. */}
        <div className="p-6 text-ink-secondary">
          <p role="status">
            Player not implemented yet: <span className="text-ink-primary">{diagram.head.title}</span>
          </p>
        </div>
      </PlayerIsland>
    </section>
  );
}
