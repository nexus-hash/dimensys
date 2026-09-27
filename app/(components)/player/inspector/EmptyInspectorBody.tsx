/** Shown for an element with nothing to inspect: a node with no `sheet`, or a selection kind the inspector doesn't have a panel for at all (e.g. a `flow` selection — T3.6 only builds panels for board nodes and links). */
export function EmptyInspectorBody({ message = 'No additional details for this element yet.' }: { message?: string }) {
  return (
    <div className="p-4 text-body text-ink-muted">
      <p role="status">{message}</p>
    </div>
  );
}
