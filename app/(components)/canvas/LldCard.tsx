import type { LldField, LldMethod, LldVisibility } from './types';

const ROW_H = 18;
const PAD = 10;
const HEADER_H = 30;

/**
 * UML visibility glyph (§5.7: "+ − #"). The engine's `Visibility` type also
 * allows `package`; the spec's glyph set doesn't cover it, so this uses the
 * conventional UML `~` — see DS5 SPEC GAPS.
 */
const VISIBILITY_GLYPH: Record<LldVisibility, string> = {
  public: '+',
  private: '−',
  protected: '#',
  package: '~',
};

function methodSignature(m: LldMethod): string {
  const params = (m.params ?? []).map((p) => `${p.name}: ${p.type}`).join(', ');
  const ret = m.returns ? `: ${m.returns}` : '';
  return `${m.name}(${params})${ret}`;
}

/**
 * A static LLD UML card (§5.7): name / stereotype, fields, methods, each
 * member prefixed with its visibility glyph. Relation lines (inherits,
 * implements, composes, aggregates) are drawn by `Link` with the matching
 * marker from `CanvasDefs` — this component only draws the card itself.
 */
export function LldCard({
  id,
  name,
  stereotype,
  fields = [],
  methods = [],
  x = 0,
  y = 0,
  width = 220,
}: {
  id: string;
  name: string;
  /** `interface` / `enum` / an abstract-class label, shown as `«stereotype»`. */
  stereotype?: string;
  fields?: LldField[];
  methods?: LldMethod[];
  x?: number;
  y?: number;
  width?: number;
}) {
  const fieldsH = fields.length ? fields.length * ROW_H + PAD : 0;
  const methodsH = methods.length ? methods.length * ROW_H + PAD : 0;
  const height = HEADER_H + fieldsH + methodsH + PAD;
  const fieldsY = HEADER_H;
  const methodsY = HEADER_H + fieldsH;

  return (
    <g transform={`translate(${x}, ${y})`} data-lld-id={id} role="img" aria-label={`${name} class card`}>
      <rect className="cv-lld-card" width={width} height={height} rx={10} strokeWidth={1} />
      {stereotype && (
        <text className="cv-lld-stereotype" x={width / 2} y={14} textAnchor="middle">
          «{stereotype}»
        </text>
      )}
      <text className="cv-lld-name" x={width / 2} y={stereotype ? 26 : 20} textAnchor="middle">
        {name}
      </text>
      <line className="cv-lld-rule" x1={0} y1={HEADER_H} x2={width} y2={HEADER_H} />

      {fields.map((f, i) => {
        const rowY = fieldsY + PAD / 2 + i * ROW_H + 13;
        return (
          <text key={`${f.name}-${i}`} className="cv-lld-member" x={10} y={rowY}>
            {VISIBILITY_GLYPH[f.visibility ?? 'public']} {f.name}: {f.type}
            {f.static ? ' (static)' : ''}
          </text>
        );
      })}
      {fields.length > 0 && <line className="cv-lld-rule" x1={0} y1={methodsY} x2={width} y2={methodsY} />}

      {methods.map((m, i) => {
        const rowY = methodsY + PAD / 2 + i * ROW_H + 13;
        return (
          <text key={`${m.name}-${i}`} className="cv-lld-member" x={10} y={rowY}>
            {VISIBILITY_GLYPH[m.visibility ?? 'public']} {methodSignature(m)}
            {m.static ? ' (static)' : ''}
          </text>
        );
      })}
    </g>
  );
}
