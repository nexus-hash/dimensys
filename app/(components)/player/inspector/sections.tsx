import type { ReactNode } from 'react';
import { Markdown } from '@/app/(components)/content/Markdown';
import { CodeBlock } from '@/app/(components)/content/CodeBlock';
import { AnnotatedCode } from '@/app/(components)/content/AnnotatedCode';
import { Meter } from '@/app/(components)/data';
import { Pill } from '@/app/(components)/ui';
import type {
  Part,
  ProsePart,
  PairsPart,
  GridPart,
  BulletsPart,
  SourcePart,
  NotedSourcePart,
  RisksPart,
  TradePart,
  CalcPart,
  SparkPart,
  Scalar,
} from '../types';
import type { SectionContext } from './context';
import { SectionHeading } from './SectionHeading';
import { TradeToggle } from './TradeToggle';
import { CalcPanel } from './CalcPanel';
import { SparkPanel } from './SparkPanel';
import { EmbedSection } from './EmbedSection';

/**
 * Section renderers for a detail sheet's `parts` (T3.6, T3.7). One function per
 * `Part.shape`; `SectionRenderer` is the single registry that dispatches on
 * `part.shape`, so adding a shape later means adding one case here, not
 * hunting through the inspector.
 *
 * `ProseSection`/`SourceSection`/`NotedSourceSection` are `async` because
 * they wrap the content kit's `Markdown`/`CodeBlock`/`AnnotatedCode`, which
 * are themselves async Server Components (server-side Shiki highlighting —
 * see `app/(components)/content/CodeBlock.tsx`). Calling them as plain JSX
 * (`<Markdown .../>`) — the pattern the rest of the app already uses
 * (`ContentGallery.tsx`) — is what keeps this shape "server-rendered where
 * possible": no markdown parser or highlighter ships to the client, only
 * the resulting HTML. The `await` inside each of these three functions
 * mirrors `Markdown.tsx`'s own internal `await CodeBlock(...)` and exists so
 * these three can also be unit-tested the same way `Markdown`/`AnnotatedCode`
 * already are: call the function directly and `await` it to get a fully
 * resolved element before handing it to `@testing-library/react` (whose
 * plain DOM renderer, unlike Next's real RSC/flight renderer, cannot itself
 * await an async component).
 */

function ScalarText({ value }: { value: Scalar }) {
  if (value === null) return <span className="text-ink-muted">—</span>;
  return <>{String(value)}</>;
}

async function ProseSection({ part }: { part: ProsePart }) {
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      {await Markdown({ content: part.md, className: 'text-body' })}
    </section>
  );
}

function PairsSection({ part }: { part: PairsPart }) {
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
        {part.pairs.map(([key, value, hint], i) => (
          <div className="contents" key={`${key}-${i}`}>
            <dt className="min-w-0 break-words text-ink-muted">{key}</dt>
            <dd className="min-w-0 break-words text-ink-primary" title={hint}>
              <ScalarText value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function GridSection({ part }: { part: GridPart }) {
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      <div className="overflow-x-auto rounded-lg border border-line-hairline">
        <table className="min-w-full text-left text-body">
          <thead>
            <tr>
              {part.heads.map((head, i) => (
                <th key={i} className="border-b border-line-hairline bg-surface-overlay px-3 py-2 font-semibold text-ink-primary">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {part.cells.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border-t border-line-hairline px-3 py-2 text-ink-secondary">
                    <ScalarText value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Only `ok`/`warn`/`critical` map to a real color token (`lint:colors` keeps this app to design tokens); any other `mood` — including the `info`/`accent`/`muted` values `ViewData`'s own docs mention — falls back to a neutral dot rather than inventing an untracked color. */
function moodDotClass(mood?: string): string {
  if (mood === 'ok') return 'bg-signal-ok';
  if (mood === 'warn') return 'bg-signal-warn';
  if (mood === 'critical') return 'bg-signal-critical';
  return 'bg-ink-muted';
}

function BulletsSection({ part }: { part: BulletsPart }) {
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      <ul className="flex flex-col gap-1.5 text-body">
        {part.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full ${moodDotClass(item.mood)}`} />
            <span className="min-w-0 break-words text-ink-secondary">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function SourceSection({ part }: { part: SourcePart }) {
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      {await CodeBlock({ code: part.src, language: part.lang })}
      {part.legend ? <p className="mt-2 text-caption text-ink-muted">{part.legend}</p> : null}
    </section>
  );
}

/**
 * `NotedSourcePart.notes` annotate a *term* (a token that appears in the
 * source), not a line number — the content kit's `AnnotatedCode`, reused
 * here as the spec asks, annotates lines. This maps each note to the first
 * source line containing its term. A term absent from `src` (a stale note)
 * is dropped rather than mis-annotating line 1.
 */
async function NotedSourceSection({ part }: { part: NotedSourcePart }) {
  const lines = part.src.split('\n');
  const annotations = part.notes
    .map((note) => {
      const lineIndex = lines.findIndex((line) => line.includes(note.term));
      return lineIndex === -1 ? null : { lineNumber: lineIndex + 1, note: note.md };
    })
    .filter((a): a is { lineNumber: number; note: string } => a !== null);
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      {await AnnotatedCode({ code: part.src, language: part.lang, annotations })}
    </section>
  );
}

/** Bottlenecks: `RisksPart.risks` has no severity level of its own — `alarm` (a live-watched risk) is the only signal the view data carries, so that's what picks the chip. */
function RisksSection({ part }: { part: RisksPart }) {
  return (
    <section className="min-w-0">
      <SectionHeading title={part.title} assumed={part.assumed} />
      <ul className="flex flex-col gap-3">
        {part.risks.map((risk, i) => (
          <li key={i} className="min-w-0 rounded-lg border border-line-hairline p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Pill variant={risk.alarm ? 'critical' : 'warn'} className="flex-none">
                {risk.alarm ? 'Watched bottleneck' : 'Bottleneck'}
              </Pill>
              <span className="min-w-0 break-words font-medium text-ink-primary">{risk.text}</span>
            </div>
            <p className="break-words text-body text-ink-secondary">{risk.danger}</p>
            <p className="mt-1 break-words text-body text-ink-muted">
              <span className="font-medium text-ink-secondary">Mitigation: </span>
              {risk.remedy}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Tradeoffs. A part that follows a live switch (`flip`) becomes the
 * interactive toggle (`TradeToggle`); any other is static: each axis score
 * as a 0–10 meter, then every option's pros and cons.
 */
function TradeSection({ part, ctx }: { part: TradePart; ctx: SectionContext }) {
  const sw = part.flip ? ctx.switches.find((x) => x.id === part.flip) : undefined;
  if (sw && sw.opts.length > 0) return <TradeToggle part={part} sw={sw} />;
  return (
    <section className="min-w-0" data-inspector-trade="static">
      <SectionHeading title={part.title} assumed={part.assumed} />
      {part.axes.length > 0 ? (
        <div className="grid gap-2.5">
          {part.axes.map(([axis, score]) => (
            <Meter key={axis} label={axis} value={score / 10} valueLabel={`${score} / 10`} severity={0} />
          ))}
        </div>
      ) : null}
      {part.picks.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {part.picks.map((pick, i) => (
            <li key={i} className="min-w-0 rounded-lg border border-line-hairline p-3">
              <p className="mb-1 break-words font-medium text-ink-primary">{pick.text}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body">
                <dt className="font-medium text-ink-primary">Pros</dt>
                <dd className="min-w-0 break-words text-ink-secondary">{pick.plus}</dd>
                <dt className="font-medium text-ink-primary">Cons</dt>
                <dd className="min-w-0 break-words text-ink-secondary">{pick.minus}</dd>
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CalcSection({ part, ctx }: { part: CalcPart; ctx: SectionContext }) {
  const calc = ctx.calcs.find((c) => c.id === part.calc);
  if (!calc) return <AdvancedSection part={part} />;
  return <CalcPanel part={part} calc={calc} />;
}

function SparkSection({ part, ctx }: { part: SparkPart; ctx: SectionContext }) {
  return <SparkPanel part={part} elementId={ctx.elementId} />;
}

/**
 * The fallback for a shape this app has never seen (a newer view file than
 * the app), or a live part whose target is missing from the view: the
 * section's own title plus a "Coming soon" chip, so nothing is silently
 * dropped from the sheet.
 */
function AdvancedSection({ part }: { part: Part }) {
  return (
    <section
      data-inspector-advanced-shape={part.shape}
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-dashed border-line-hairline px-3 py-2.5"
    >
      <span className="min-w-0 truncate text-body font-medium text-ink-secondary">{part.title}</span>
      <Pill variant="neutral">Coming soon</Pill>
    </section>
  );
}

/** Every shape with a real renderer below. Anything else falls to `AdvancedSection`. `NodeInspectorBody` uses this same set to decide whether a pane has anything to show for tab ordering. */
export const SIMPLE_SHAPES = new Set<Part['shape']>([
  'prose',
  'pairs',
  'grid',
  'bullets',
  'source',
  'notedSource',
  'risks',
  'trade',
  'calc',
  'spark',
  'embed',
]);

/** Whether `shape` has a real (non-"Coming soon") renderer. */
export function isSimpleShape(shape: Part['shape']): boolean {
  return SIMPLE_SHAPES.has(shape);
}

/** Dispatches a `Part` to its section renderer by `shape`. The `default` case is what makes an unknown shape a "Coming soon" row instead of a silent gap. */
export function SectionRenderer({ part, ctx }: { part: Part; ctx: SectionContext }): ReactNode {
  switch (part.shape) {
    case 'prose':
      return <ProseSection part={part} />;
    case 'pairs':
      return <PairsSection part={part} />;
    case 'grid':
      return <GridSection part={part} />;
    case 'bullets':
      return <BulletsSection part={part} />;
    case 'source':
      return <SourceSection part={part} />;
    case 'notedSource':
      return <NotedSourceSection part={part} />;
    case 'risks':
      return <RisksSection part={part} />;
    case 'trade':
      return <TradeSection part={part} ctx={ctx} />;
    case 'calc':
      return <CalcSection part={part} ctx={ctx} />;
    case 'spark':
      return <SparkSection part={part} ctx={ctx} />;
    case 'embed':
      return <EmbedSection part={part} />;
    default:
      return <AdvancedSection part={part} />;
  }
}

// Exported individually for component tests (see `__tests__/sections.test.tsx`);
// `SectionRenderer` above is what `NodeInspectorBody` actually calls.
export {
  ProseSection,
  PairsSection,
  GridSection,
  BulletsSection,
  SourceSection,
  NotedSourceSection,
  RisksSection,
  TradeSection,
  CalcSection,
  SparkSection,
  AdvancedSection,
};
