import { loadPlayerDiagram } from '@/app/(server)/engine/publicData';
import { DiagramCard } from './DiagramCard';

/**
 * "03" showcase visual (S4.6a). The design's pitch for this slot is a
 * subsystem drill-down (a box zooming open into its ring/cluster) — no
 * shipped diagram declares a drillable subsystem yet, so that specific demo
 * would be fake. What's real today is the walkthrough itself: the featured
 * diagram's actual story titles, read from the synced catalog. The
 * subsystem-zoom visual is a documented slot for whenever a diagram ships
 * one (T3.4's `DrilldownBlueprint` already renders it inside the full
 * player — this card doesn't duplicate that engine, just lists what a
 * visitor will step through).
 */
export async function WalkthroughVisual({ diagramId }: { diagramId: string }) {
  const diagram = await loadPlayerDiagram(diagramId);
  const stories = diagram?.stories ?? [];

  return (
    <DiagramCard>
      <ol className="flex flex-col gap-3">
        {stories.map((story, i) => (
          <li key={story.id} className="flex items-baseline gap-3">
            <span className="font-mono text-mono-sm text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-body text-ink-primary">{story.text}</span>
          </li>
        ))}
        {stories.length === 0 && <li className="text-body text-ink-secondary">Walkthroughs coming to this diagram.</li>}
      </ol>
      <figcaption className="mt-4 font-mono text-mono-sm text-ink-muted">
        real walkthrough steps, {diagram?.head.title ?? diagramId}
      </figcaption>
    </DiagramCard>
  );
}
