import type { ReactNode } from 'react';
import { Markdown } from '@/app/(components)/content/Markdown';
import { CodeBlock } from '@/app/(components)/content/CodeBlock';
import { AnnotatedCode } from '@/app/(components)/content/AnnotatedCode';
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
  Scalar,
} from '../types';

/**
 * Section renderers for a detail sheet's `parts` (T3.6). One function per
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

function SectionHeading({ title, assumed }: { title: string; assumed?: true }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="min-w-0 break-words text-label font-semibold text-ink-secondary">{title}</h3>
      {assumed ? <Pill variant="neutral" className="flex-none">assumed</Pill> : null}
    </div>
  );
}

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
 * The fallback for every shape T3.6 doesn't render yet — `trade` (tradeoff
 * axes/picks), `calc` (the sizing calculator), `spark` (live sparklines),
 * `embed` (diagram refs), and anything future — so nothing is silently
 * dropped from the sheet. A neutral, compact row: the section's own title
 * plus a "Coming soon" chip. T3.7 plugs its real renderers in by adding
 * cases to `SectionRenderer` below (and adding the shape to `SIMPLE_SHAPES`)
 * — this is the one place that needs to change.
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

/** Shapes with a real renderer above — anything else (`trade`/`calc`/`spark`/`embed`, or a future shape this app has never seen) falls to `AdvancedSection`. `NodeInspectorBody` uses this same set to decide whether a *pane* is advanced-only (see its doc comment) for tab ordering. */
export const SIMPLE_SHAPES = new Set<Part['shape']>(['prose', 'pairs', 'grid', 'bullets', 'source', 'notedSource', 'risks']);

/** Whether `shape` has a real (non-"Coming soon") renderer above. */
export function isSimpleShape(shape: Part['shape']): boolean {
  return SIMPLE_SHAPES.has(shape);
}

/** Dispatches a `Part` to its section renderer by `shape`. The `default` case is what makes an unknown shape (an advanced one, or one this app has never seen) a "Coming soon" row instead of a silent gap. */
export function SectionRenderer({ part }: { part: Part }): ReactNode {
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
    default:
      return <AdvancedSection part={part} />;
  }
}

// Exported individually for component tests (see `__tests__/sections.test.tsx`);
// `SectionRenderer` above is what `NodeInspectorBody` actually calls.
export { ProseSection, PairsSection, GridSection, BulletsSection, SourceSection, NotedSourceSection, RisksSection, AdvancedSection };
