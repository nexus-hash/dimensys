import type { ElementIndex } from '../shell/selection';
import type { LinkView } from '../types';

/**
 * A link's inspector body (T3.6). `LinkView` carries no `sheet` of its own
 * — the view-data contract only puts detail panels on nodes — so this is
 * always the fallback the brief describes: endpoints, protocol/kind and
 * label.
 */
export function LinkInspectorBody({ link, index }: { link: LinkView; index: ElementIndex }) {
  const from = index.nodes.get(link.a)?.text ?? link.a;
  const to = index.nodes.get(link.b)?.text ?? link.b;
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4">
      <section className="min-w-0">
        <h3 className="mb-2 text-label font-semibold text-ink-secondary">Connection</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
          <dt className="min-w-0 break-words text-ink-muted">From</dt>
          <dd className="min-w-0 break-words text-ink-primary">{from}</dd>
          <dt className="min-w-0 break-words text-ink-muted">To</dt>
          <dd className="min-w-0 break-words text-ink-primary">{to}</dd>
          <dt className="min-w-0 break-words text-ink-muted">Protocol</dt>
          <dd className="min-w-0 break-words text-ink-primary">{link.line}</dd>
          {link.rel ? (
            <>
              <dt className="min-w-0 break-words text-ink-muted">Relation</dt>
              <dd className="min-w-0 break-words text-ink-primary">{link.rel}</dd>
            </>
          ) : null}
          {link.text ? (
            <>
              <dt className="min-w-0 break-words text-ink-muted">Label</dt>
              <dd className="min-w-0 break-words text-ink-primary">{link.text}</dd>
            </>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
