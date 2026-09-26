/**
 * A DSA pointer marker (§5.7): a mono pill above a cell (`i`, `j`, …).
 * `stackIndex` offsets markers that share a cell so they stack instead of
 * overlapping (the spec's "when two markers share a cell they stack").
 */
export function PointerMarker({
  id,
  label,
  x = 0,
  y = 0,
  stackIndex = 0,
}: {
  id: string;
  label: string;
  x?: number;
  y?: number;
  stackIndex?: number;
}) {
  const w = Math.max(24, label.length * 8 + 14);
  const yOffset = -34 - stackIndex * 22;

  return (
    <g className="cv-marker" transform={`translate(${x}, ${y + yOffset})`} data-marker-id={id} role="img" aria-label={`marker ${label}`}>
      <rect x={-w / 2} y={-12} width={w} height={24} rx={12} />
      <text x={0} y={4.5} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
