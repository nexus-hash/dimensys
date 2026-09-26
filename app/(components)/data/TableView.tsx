/**
 * The "view as table" affordance every chart in the design spec must offer alongside its
 * hover tooltip, so the same series is available to anyone who can't (or
 * doesn't want to) read the SVG — screen reader users, keyboard-only users,
 * anyone who wants to copy the numbers out.
 *
 * A native `<details>/<summary>` disclosure: no JS, no client component,
 * keyboard-operable and screen-reader-exposed for free.
 */
export function TableView({
  caption,
  columns,
  rows,
  buttonLabel = 'View as table',
  className,
}: {
  /** Screen-reader-only table caption, e.g. "p99 latency, last 60 seconds". */
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  buttonLabel?: string;
  className?: string;
}) {
  return (
    <details className={className ? `${className} mt-1` : 'mt-1'}>
      <summary className="cursor-pointer list-none text-caption text-ink-muted underline decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden hover:text-ink-secondary">
        {buttonLabel}
      </summary>
      <div className="mt-2 max-h-[200px] overflow-auto rounded-md border border-line-hairline">
        <table className="w-full border-collapse text-caption">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="sticky top-0 border-b border-line-hairline bg-surface-page px-1.5 py-1 text-left font-medium text-ink-muted"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={
                      j === 0
                        ? 'border-b border-line-hairline px-1.5 py-1 text-left text-ink-secondary'
                        : 'border-b border-line-hairline px-1.5 py-1 text-right font-mono tabular-nums text-ink-primary'
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
