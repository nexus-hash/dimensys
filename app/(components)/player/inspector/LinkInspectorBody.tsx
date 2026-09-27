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
    <div className="flex flex-col gap-6 p-4">
      <section>
        <h3 className="mb-2 text-label font-semibold text-ink-secondary">Connection</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
          <dt className="text-ink-muted">From</dt>
          <dd className="text-ink-primary">{from}</dd>
          <dt className="text-ink-muted">To</dt>
          <dd className="text-ink-primary">{to}</dd>
          <dt className="text-ink-muted">Protocol</dt>
          <dd className="text-ink-primary">{link.line}</dd>
          {link.rel ? (
            <>
              <dt className="text-ink-muted">Relation</dt>
              <dd className="text-ink-primary">{link.rel}</dd>
            </>
          ) : null}
          {link.text ? (
            <>
              <dt className="text-ink-muted">Label</dt>
              <dd className="text-ink-primary">{link.text}</dd>
            </>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
