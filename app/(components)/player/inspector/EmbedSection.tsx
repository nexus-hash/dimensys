import Link from 'next/link';
import { Button, Pill } from '@/app/(components)/ui';
import type { EmbedPart } from '../types';
import type { EmbedTarget } from './embedTarget';
import { MiniBoard } from './MiniBoard';
import { SectionHeading } from './SectionHeading';

/**
 * The embed card itself, given an already-resolved target. A ready target
 * links to its page ("Open"); anything else (planned, or not in the catalog)
 * is the same card with a disabled "Coming soon" state instead of a link.
 */
export function EmbedCard({ part, target }: { part: EmbedPart; target: EmbedTarget }) {
  const name = target.title ?? part.diagram;
  const href = `/solutions/${encodeURIComponent(target.id)}`;
  return (
    <section className="min-w-0" data-inspector-embed={target.ready ? 'ready' : 'soon'}>
      <SectionHeading title={part.title} assumed={part.assumed} />
      <div
        className={`overflow-hidden rounded-lg border border-line-hairline bg-surface-raised ${target.ready ? '' : 'border-dashed'}`}
      >
        {target.ready && target.board ? (
          <div className="canvas-surface border-b border-line-hairline p-2">
            <MiniBoard board={target.board} className="block h-[96px] w-full" />
          </div>
        ) : null}
        <div className="flex flex-col gap-2 p-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 break-words font-medium text-ink-primary">{name}</p>
            {target.ready ? null : (
              <Pill variant="neutral" className="flex-none">
                Coming soon
              </Pill>
            )}
          </div>
          {part.note ? (
            <p className="break-words text-body text-ink-secondary">
              {part.note}
            </p>
          ) : null}
          {target.ready ? (
            <Button asChild variant="glass" size="sm" className="self-start">
              <Link href={href} aria-label={`Open ${name}`}>
                Open <span aria-hidden="true">↗</span>
              </Link>
            </Button>
          ) : (
            <Button variant="glass" size="sm" className="self-start" disabled>
              Open
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Embed (diagram reference): resolves the target at render time (server
 * only; the catalog lookup is imported lazily so nothing server-only is
 * pulled in by modules that merely import the section registry).
 */
export async function EmbedSection({ part }: { part: EmbedPart }) {
  const { loadEmbedTarget } = await import('./embedTarget');
  const target = await loadEmbedTarget(part.diagram);
  return <EmbedCard part={part} target={target} />;
}
