import type { LldField, LldMethod, LldVisibility } from './types';
import { MONO_CHAR_EM, truncateToWidth } from './text';

const ROW_H = 18;
const PAD = 10;
const HEADER_H = 30;
/** Matches `.cv-lld-member` in globals.css. */
const MEMBER_FONT_SIZE = 12;

/**
 * UML visibility glyph. The engine's `Visibility` type also
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
 * A static LLD UML card: name / stereotype, fields, methods, each
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

  // Every field/method row is a single mono line starting at x=10 — truncate
  // it to what actually fits before the card's right edge (`PAD` px of
  // margin), the same estimate-then-clip idiom `Node`'s label/sub-label use
  // (see text.ts), so a long type/signature never runs past the card's own
  // border. The full text always ships in a native `<title>` tooltip.
  const rowMaxWidth = Math.max(0, width - 10 - PAD);
  const rowCharWidth = MEMBER_FONT_SIZE * MONO_CHAR_EM;
  const cardClipId = `${id}-lld-clip`;

  return (
    <g transform={`translate(${x}, ${y})`} data-lld-id={id} role="img" aria-label={`${name} class card`}>
      <rect className="cv-lld-card" width={width} height={height} rx={10} strokeWidth={1} />
      {/* Hard safety net: whatever the row-truncation estimate above gets
          wrong (or the centered name/stereotype, which isn't truncated),
          nothing can render past the card's own rounded rect. */}
      <clipPath id={cardClipId}>
        <rect width={width} height={height} rx={10} />
      </clipPath>
      <g clipPath={`url(#${cardClipId})`}>
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
          const full = `${VISIBILITY_GLYPH[f.visibility ?? 'public']} ${f.name}: ${f.type}${f.static ? ' (static)' : ''}`;
          const display = truncateToWidth(full, rowMaxWidth, rowCharWidth);
          return (
            <text key={`${f.name}-${i}`} className="cv-lld-member" x={10} y={rowY}>
              {display !== full && <title>{full}</title>}
              {display}
            </text>
          );
        })}
        {fields.length > 0 && <line className="cv-lld-rule" x1={0} y1={methodsY} x2={width} y2={methodsY} />}

        {methods.map((m, i) => {
          const rowY = methodsY + PAD / 2 + i * ROW_H + 13;
          const full = `${VISIBILITY_GLYPH[m.visibility ?? 'public']} ${methodSignature(m)}${m.static ? ' (static)' : ''}`;
          const display = truncateToWidth(full, rowMaxWidth, rowCharWidth);
          return (
            <text key={`${m.name}-${i}`} className="cv-lld-member" x={10} y={rowY}>
              {display !== full && <title>{full}</title>}
              {display}
            </text>
          );
        })}
      </g>
    </g>
  );
}
