'use client';

/**
 * Subsystem drill-path breadcrumbs (T3.4): "System › Key Generation Service".
 * Pure presentational — `DrillStage` owns the store read and the navigation
 * side effects (focus return included); this component only renders the
 * current path and reports which depth was clicked.
 */
export interface BreadcrumbsProps {
  rootLabel: string;
  /** Subsystem ids from the root, in order — `PlayerState.drill`. */
  drill: readonly string[];
  /** Subsystem id → label, for every drillable subsystem in the diagram. */
  labelsById: Record<string, string>;
  /** Called with the depth to jump to (`0` = root, `drill.length` = already there). */
  onNavigate: (depth: number) => void;
  /**
   * Leave the root crumb out: the caller already shows the diagram title
   * (the top bar's own heading, which becomes the way back to the root),
   * so repeating it here read as "Title Title › Subsystem".
   */
  omitRoot?: boolean;
}

export function Breadcrumbs({ rootLabel, drill, labelsById, onNavigate, omitRoot = false }: BreadcrumbsProps) {
  if (drill.length === 0) return null;

  const crumbs = [
    ...(omitRoot ? [] : [{ depth: 0, label: rootLabel }]),
    ...drill.map((id, i) => ({ depth: i + 1, label: labelsById[id] ?? id })),
  ];

  return (
    <nav aria-label="Subsystem breadcrumbs" className="player-breadcrumbs">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-secondary">
        {crumbs.map((crumb, i) => {
          const isCurrent = i === crumbs.length - 1;
          return (
            <li key={crumb.depth} className="flex items-center gap-1">
              {(i > 0 || omitRoot) && (
                <span aria-hidden="true" className="text-ink-muted">
                  ›
                </span>
              )}
              {isCurrent ? (
                <span aria-current="location" className="font-medium text-ink-primary">
                  {crumb.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.depth)}
                  className="rounded px-1 -mx-1 hover:text-ink-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-primary)]"
                >
                  {crumb.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
