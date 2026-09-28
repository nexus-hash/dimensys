/**
 * The view-data contract (T3.1/T2.5): the only shapes the app knows about
 * the engine build's output. Names here are neutral view-model names — no
 * key describes an authoring field, only what is drawn and read: boxes,
 * labels, link routes, nesting, detail panels, walkthrough frames, scenario
 * captions and questions, control labels, requirement badges, calculator
 * labels. This file is a straight copy of that shared shape; the app must
 * not depend on anything beyond `ViewData`, `CatalogView`, `PathView` and
 * `RuntimeManifest`.
 *
 * Conventions worth knowing when reading these types:
 * - Ids are the element ids of nodes, links, scenarios, walkthroughs, steps,
 *   fixes, switches and so on — also the share-URL contract.
 * - Times are simulated seconds under the key `t`.
 * - `hue`/`st`/`mood` are semantic color tokens (`ok`, `warn`, `critical`,
 *   `info`, `accent`, `muted`, plus algorithm-state tokens); the player owns
 *   the palette.
 * - Markdown fields (`md`, `intro`, `task`, `then`, `truth`, …) are
 *   CommonMark with no raw HTML.
 * - Live things (`alarm`, `calc`, `gauges[].probe`, `spark.series`) are
 *   referenced by neutral ids that the runtime worker reports on.
 * - Absent means "not applicable" — optional keys are omitted, never `null`,
 *   unless `null` is itself a real value (a marker pointing nowhere, a table
 *   cell).
 *
 * `RUNTIME_FORMAT` is one integer covering the view model shape, the sim
 * payload encoding and its decoder dictionary. The app refuses a view file
 * or manifest whose `fmt`/`runtimeFormat` it doesn't know; bump this only in
 * lockstep with an engine build that changed the contract.
 */

/** Version of the view-data / manifest format this app was built against. */
export const RUNTIME_FORMAT = 3;

// ---------------------------------------------------------------------------
// Shared small shapes
// ---------------------------------------------------------------------------

/** `[x, y, w, h]`: a box, `x`/`y` its center, in layout units. */
export type Box = [number, number, number, number];

/** `[x, y]`. */
export type XY = [number, number];

/** A scalar shown in a field, table cell or watch panel. */
export type Scalar = string | number | boolean | null;

/** Particle density: one number, or `[forward, backward]`. */
export type Flux = number | [number, number];

// ---------------------------------------------------------------------------
// Board: nodes, links, nesting
// ---------------------------------------------------------------------------

/** One class member line, pre-rendered, e.g. `+ get(key: string): Value`. */
export interface MemberLine {
  text: string;
  /** `public` | `private` | `protected` | `package`. */
  vis?: string;
  /** Static member (underlined). */
  stat?: true;
  /** Abstract member (italic). */
  abst?: true;
}

/** Class box contents. */
export interface ClassBody {
  /** Stereotype text, e.g. `singleton`. */
  tag?: string;
  attrs: MemberLine[];
  ops: MemberLine[];
  /** Enum constants. */
  consts: string[];
}

/** A drawn node. */
export interface NodeView {
  id: string;
  /** Node shape family, e.g. `server`, `db`, `cell`, `class`. Picks the base glyph. */
  form: string;
  /** Icon sub-style, e.g. `sql`, `mobile`. Unknown values fall back to `form`'s glyph. */
  flavor?: string;
  /** Visible label. */
  text: string;
  /** Tooltip / screen-reader line. */
  tip?: string;
  /** HA role shown as a chip, e.g. `primary`. */
  duty?: string;
  /** Static badge text. */
  chip?: string;
  /** Static emphasis color token. */
  hue?: string;
  /** Layout box. Absent for spare nodes (they appear only after a change). */
  box?: Box;
  /** Replica stack count to draw (>1 renders stacked). */
  stack?: number;
  /** Internal slot fields: `[key, value, hint?]`. */
  slots?: Array<[string, Scalar] | [string, Scalar, string]>;
  /** Class body. */
  uml?: ClassBody;
  /** Detail panel. */
  sheet?: Sheet;
}

/** A drawn link. */
export interface LinkView {
  id: string;
  /** Start node id (always a drawn node). */
  a: string;
  /** End node id (always a drawn node). */
  b: string;
  /** Arrowheads at both ends. */
  two?: true;
  /** Line style: `sync` (solid) | `async` (dashed) | `stream` (flowing). */
  line: string;
  /** Label drawn on the link. */
  text?: string;
  /** Relation glyph, e.g. `inherits`. */
  rel?: string;
  /** Multiplicities `[atStart, atEnd]`. */
  ends?: [string | null, string | null];
  /**
   * Route points. A polyline — or, when `curve` is set, cubic Bézier control
   * points `[p0, c1, c2, p1, c1, c2, p2, …]` (3n + 1): the drawn link starts
   * at the source port, passes through every third point and ends at the
   * target port. Absent for spare links.
   */
  route?: XY[];
  /** `route` is a cubic Bézier chain (draw `M p0 C c1 c2 p1 …`), not a polyline. */
  curve?: true;
  /** Static particle density (only used when nothing is simulated). */
  flux?: Flux;
  /**
   * Collision-free label anchor: the label pill's centre, in route
   * coordinates (on the drawn curve itself), the route's dominant direction
   * there (`h`/`v` — the pill itself always renders horizontal regardless), and the pill's
   * own size (`sz`, `[w, h]`) to draw it at — calibrated against this
   * player's real pill geometry (see `LABEL_PILL` in `canvas/Link.tsx`), so
   * this component draws the pill at exactly this size instead of
   * re-estimating it from `text.length` with its own numbers. Present
   * whenever both `text` and `route` are; a link with `text` but no `cap`
   * (an older/unsynced document) falls back to the route's own arc-length
   * midpoint, sized from `text.length` the old way.
   */
  cap?: { pt: XY; axis: 'h' | 'v'; sz: XY };
}

/** One graph level. */
/**
 * A labelled frame drawn round a group of nodes. No state or metrics of its
 * own; its tab label is a button that opens the group's detail panel.
 */
export interface FrameView {
  id: string;
  /** Tab label. */
  text: string;
  /** Border style: `region` | `zone` | `vpc` | `cluster` | `group`. */
  look: string;
  /** The border's box. Every node in `holds` sits inside it with padding; the tab sits just above it. */
  box: Box;
  /** Ids of every node inside the frame (at any depth). */
  holds: string[];
  /** The group's own detail panel, same shape as a node's. */
  sheet?: Sheet;
}

/** The drawn diagram: one flat graph, every node at the same scale. */
export interface Board {
  /** `[w, h]`. */
  size: XY;
  blocks: NodeView[];
  wires: LinkView[];
  /** Frames, outer before inner (draw order). Absent when there are none. */
  frames?: FrameView[];
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

interface PartBase {
  title: string;
  /** Tab: `overview` | `architecture` | `operations`. */
  pane: string;
  /** Source ids backing the part. */
  refs?: string[];
  /** Numbers are an assumption ("assumed" badge). */
  assumed?: true;
}

export interface ProsePart extends PartBase { shape: 'prose'; md: string }
export interface PairsPart extends PartBase { shape: 'pairs'; pairs: Array<[string, string | number] | [string, string | number, string]> }
export interface GridPart extends PartBase { shape: 'grid'; heads: string[]; cells: Scalar[][] }
export interface BulletsPart extends PartBase { shape: 'bullets'; items: Array<{ text: string; mood?: string }> }
export interface SourcePart extends PartBase { shape: 'source'; lang: string; src: string; legend?: string }
export interface NotedSourcePart extends PartBase { shape: 'notedSource'; lang: string; src: string; notes: Array<{ term: string; md: string }> }
export interface TradePart extends PartBase {
  shape: 'trade';
  /** Radar: `[axis, score 0–10]`. */
  axes: Array<[string, number]>;
  picks: Array<{ text: string; plus: string; minus: string }>;
  /** Live switch id (`ViewData.switches`) this part follows. */
  flip?: string;
}
export interface CalcPart extends PartBase { shape: 'calc'; calc: string }
export interface RisksPart extends PartBase {
  shape: 'risks';
  risks: Array<{ text: string; danger: string; remedy: string; alarm?: string }>;
}
export interface SparkPart extends PartBase {
  shape: 'spark';
  /**
   * Metric codes to plot for this node (see `parseMetricKey`/`metricCodeLabel`
   * in `metricKeys.ts`), e.g. `c` (utilization). The sparkline column is this
   * node's own neutral metric key, `n:<nodeId>.<code>`.
   */
  series: string[];
  /** Window in seconds. */
  span?: number;
}
export interface EmbedPart extends PartBase { shape: 'embed'; diagram: string; story?: string; note?: string }

export type Part =
  | ProsePart
  | PairsPart
  | GridPart
  | BulletsPart
  | SourcePart
  | NotedSourcePart
  | TradePart
  | CalcPart
  | RisksPart
  | SparkPart
  | EmbedPart;

export interface Sheet {
  title?: string;
  parts: Part[];
}

// ---------------------------------------------------------------------------
// Walkthroughs → stories of precomputed frames
// ---------------------------------------------------------------------------

export interface Look {
  /** Target element id. */
  el: string;
  /** Algorithm-state token. */
  st?: string;
  hue?: string;
  alpha?: number;
  shown?: boolean;
  text?: string;
  flux?: Flux;
  flavor?: string;
  sheet?: Sheet;
}

/** The complete display state of one walkthrough step. */
export interface Frame {
  id: string;
  title?: string;
  md?: string;
  /** Emphasized element ids (everything else dims). */
  lit: string[];
  looks: Look[];
  /** Marker positions `[markerId, nodeId | null]`. */
  pins: Array<[string, string | null]>;
  /** Field values `[nodeId.fieldKey, value]`. */
  cells: Array<[string, Scalar]>;
  /** Watch-panel variables `[name, value]`. */
  tally: Array<[string, Scalar]>;
  /** 1-based code lines to highlight. */
  lines: number[];
  arrow?: { a: string; b: string; text?: string };
  /** Node or frame to zoom to. */
  aim?: string;
  /** Node ids to animate particles through, in order. */
  trail?: string[];
}

export interface StoryView {
  id: string;
  text: string;
  tip?: string;
  /** Stage id this trace belongs to. */
  phase?: string;
  frames: Frame[];
}

// ---------------------------------------------------------------------------
// Scenarios → plays
// ---------------------------------------------------------------------------

export interface PlayView {
  id: string;
  text: string;
  tip?: string;
  /** `story` | `sandbox` | `incident` | `loadTest`. */
  genre: string;
  /** Length in seconds; absent for open-ended free play. */
  secs?: number;
  /** Recommended export window `[from, to]`. */
  cut?: XY;
  /** Link-preview moment. */
  still?: number;
  /** Timeline marks (`t` = seconds). */
  beats: Array<{ t: number; verb: string; el?: string; text?: string }>;
  /**
   * Caption texts for the transcript/timeline. Live values are shown as
   * `{{0}}`, `{{1}}`, … slots; the worker sends the rendered text when the
   * caption fires.
   */
  captions: Array<{ t: number; md: string; aim?: string; halt?: true; lit?: string[] }>;
  /** "What would you do?" pauses. */
  asks: Array<{
    id: string;
    t: number;
    md: string;
    picks: Array<{ id: string; text: string; then: string; real?: true }>;
    truth?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Controls: fixes, switches, Break It, HUD, calculators
// ---------------------------------------------------------------------------

export interface RemedyView {
  id: string;
  text: string;
  nature?: string;
  md: string;
  price?: string;
  /** Element ids this fix adds (see `ViewData.spares`). */
  adds?: string[];
}

export interface SwitchView {
  id: string;
  text: string;
  opts: Array<{ id: string; text: string; on?: true; axes?: Array<[string, number]>; plus?: string; minus?: string; adds?: string[] }>;
}

export interface KitView {
  /** Offered tools: `kill` | `slow` | `degrade` | `partition` | `flush` | `spike`. */
  verbs: string[];
  /** Spike slider maximum. */
  cap?: number;
  chips: Array<{ text: string; verb: string; el?: string; amt?: number }>;
  /** Remedy ids offered in the Fix It panel. */
  remedies: string[];
  /** Per element: the tools it accepts (absent = every fitting tool; `[]` = unbreakable). */
  locks: Array<[string, string[]]>;
}

export interface GaugeView {
  /**
   * Neutral metric key the worker publishes, e.g. `g.e` (a global metric) or
   * `n:api.c` (a per-node metric). Parse with `parseMetricKey` in
   * `metricKeys.ts`; never derive the display label from the key itself —
   * that's `text`/`suffix` below.
   */
  probe: string;
  text: string;
  suffix: string;
}

export interface CalcView {
  id: string;
  /** Human-readable formula line. */
  md?: string;
  sliders: Array<{ id: string; text: string; init: number; lo: number; hi: number; inc?: number; log?: true; suffix?: string; feeds?: true }>;
  results: Array<{ id: string; text: string; fmt: string; feeds?: true }>;
}

// ---------------------------------------------------------------------------
// Header, requirements, sources, extra blocks
// ---------------------------------------------------------------------------

export interface HeadView {
  title: string;
  blurb: string;
  intro?: string;
  /** Problem statement. */
  task?: string;
  grade: string;
  labels: string[];
  minutes?: number;
  byline?: string[];
  pub?: string;
  upd?: string;
  star?: true;
  search?: { title?: string; blurb?: string; words?: string[] };
}

export interface NeedView {
  id: string;
  text: string;
  /** `functional` | `non-functional`. */
  nature: string;
  /** Short measurable badge, e.g. `redirect p99 < 50 ms`. */
  chip?: string;
  /** Watch id the worker reports pass/fail for. */
  alarm?: string;
  refs?: string[];
  assumed?: true;
}

export interface RefView {
  id: string;
  title: string;
  href: string;
  by?: string;
  dated?: string;
  genre?: string;
}

export interface DrillView {
  id: string;
  /** `fixAgain` | `quiz` | `recall`. */
  genre: string;
  subject?: string;
  md: string;
  quiz?: Array<{ text: string; right: boolean; because?: string }>;
  model?: string;
  play?: string;
  remedies?: string[];
  alarm?: string;
}

export interface OutageView {
  org: string;
  title: string;
  dated: string;
  mins?: number;
  harm: string;
  cause: string;
  post: string;
  /** `[simSeconds, realMinutes]`. */
  clock?: XY;
  start?: string;
  note?: string | null;
}

export interface AlgoView {
  /** Problem input as pretty JSON text. */
  given?: string;
  phases: Array<{ id: string; text: string; bigO: [string, string]; lang: string; src: string; legend?: string; story?: string; md?: string; best?: true }>;
}

/** The per-diagram view data, as synced under `data/engine/diagrams/<id>.view.json`. */
export interface ViewData {
  fmt: number;
  /** Build hash (`sha256:…` of the source). Pairs this view with its sim payload. */
  build: string;
  id: string;
  rev: number;
  /** `hld` | `lld` | `dsa` | `incident`. */
  family: string;
  head: HeadView;
  needs: NeedView[];
  premises: string[];
  refs: RefView[];
  /** Absent for catalog-only (planned) diagrams. */
  board?: Board;
  /** Elements that only appear after a change (fix, switch, choice, timeline change). No layout yet. */
  spares: { blocks: NodeView[]; wires: LinkView[] };
  /** Pointers: `spot` = node id or `null`. */
  pins: Array<{ id: string; text: string; spot: string | null; hue?: string }>;
  stories: StoryView[];
  plays: PlayView[];
  remedies: RemedyView[];
  switches: SwitchView[];
  kit?: KitView;
  gauges: GaugeView[];
  calcs: CalcView[];
  drills: DrillView[];
  outage?: OutageView;
  algo?: AlgoView;
  motifs: Array<{ text: string; cast: string[]; md?: string }>;
  /** Whether a sim payload exists for this diagram. */
  live: boolean;
  start?: { play?: string; story?: string };
  /** `probes`: neutral metric keys (see `GaugeView.probe`). `teaser`: a share headline exists (the worker renders it). */
  social?: { probes: string[]; still?: { play: string; t: number }; teaser: boolean };
  embedding?: { on: boolean; full: boolean };
  film?: { on: boolean; cam: Array<{ t: number; aim: string; magnify?: number; pitch?: number }> };
}

// ---------------------------------------------------------------------------
// Catalog and paths (public)
// ---------------------------------------------------------------------------

export interface CatalogCard {
  id: string;
  rev: number;
  href: string;
  family: string;
  title: string;
  blurb: string;
  grade: string;
  labels: string[];
  /** `planned` | `published` (drafts are never listed). */
  lifecycle: string;
  minutes?: number;
  star?: true;
  sort?: number;
  pub?: string;
  upd?: string;
  /** Former ids, for redirects. */
  formerly?: string[];
}

/** `catalog.json`. */
export interface CatalogView {
  fmt: number;
  cards: CatalogCard[];
}

/** `paths/<id>.view.json`. */
export interface PathView {
  fmt: number;
  id: string;
  rev: number;
  title: string;
  blurb: string;
  grade: string;
  hours?: number;
  legs: Array<{ id: string; title: string; doing: string; goto: string; done: string; bar?: number }>;
}

// ---------------------------------------------------------------------------
// Manifest (engine build → app sync). Not shipped to the browser.
// ---------------------------------------------------------------------------

/** One written file with its content hash. */
export interface FileEntry {
  /** Path relative to the engine build's output directory, POSIX. */
  path: string;
  /** `sha256:<hex>` of the file's bytes. */
  hash: string;
  bytes: number;
}

export interface RuntimeManifest {
  /** Manifest version. */
  version: string;
  /** `RUNTIME_FORMAT` of every view/sim file listed. */
  runtimeFormat: number;
  engineVersion: string;
  generatedAt?: string;
  /** Public catalog. */
  catalog: FileEntry;
  diagrams: Array<{
    id: string;
    route: string;
    /** Build hash (source content hash); equals `ViewData.build` and the sim payload header's. */
    build: string;
    view: FileEntry;
    /** Present only when the diagram simulates. */
    sim?: FileEntry;
    /** Server-only files (never under the app's public dir). */
    server: FileEntry[];
  }>;
  paths: Array<{ id: string; view: FileEntry; server: FileEntry[] }>;
  libraries: Array<{ id: string; server: FileEntry[] }>;
  puzzles: Array<{ id: string; publishOn: string; server: FileEntry[] }>;
  /** Every file written, each with its hash. `scope` tells the sync where it may go. */
  files: Array<FileEntry & { scope: 'public' | 'server' }>;
  staticAssets: Array<{ source: string; target: string }>;
  sharedComponents: Array<{ source: string; target: string }>;
  peerDependencies: { [pkg: string]: string };
}

// ---------------------------------------------------------------------------
// Player runtime types (app-internal; not part of the engine build's shape)
// ---------------------------------------------------------------------------

/** One logged user action: `[t, tool, target, value]`. */
export type UserAction = [number, string, string | null, number | string | boolean | null];

/** Decoded share URL. Codec is T3.12. */
export interface ShareState {
  docId: string;
  r?: number;
  v?: string;
  st?: string;
  t?: number;
  a?: UserAction[];
}

/** Health tokens as published by the worker's metrics snapshot. */
export type SimHealthToken = 'ok' | 'warn' | 'critical' | 'info' | 'accent' | 'muted';

/**
 * Serialisable runner event. Mirrored loosely: `kind` is the discriminant;
 * T3.10 narrows the members it renders.
 */
export interface RunnerEventLike {
  kind:
    | 'started'
    | 'event'
    | 'caption'
    | 'checkpoint'
    | 'choice'
    | 'skip'
    | 'reveal'
    | 'trigger'
    | 'expectation'
    | 'paused'
    | 'resumed'
    | 'ended';
  at: number;
  [field: string]: unknown;
}

/**
 * What the server hands the client boundary (`<PlayerIsland>`): small and
 * serialisable. Everything large (the full view-data document) is fetched
 * by the worker itself from the static JSON route, not passed through React
 * props.
 */
export interface PlayerBootstrap {
  diagramId: string;
  revision: number;
  /** `ViewData.build`; appended to the JSON URL so CDN caches can be immutable. */
  hash: string;
  /** Static JSON route for the full view-data document (T3.13), e.g. `/solutions/<id>/diagram.json?h=…`. */
  diagramUrl: string;
  /** Hashed URL of the runtime worker bundle under `/engine/runtime/`, or `null` when absent (no runtime, no sim). */
  runtimeUrl: string | null;
  /** Where the worker fetches the opaque sim payload from (`/solutions/<id>/sim.bin?h=...`), or `null` when there is none. */
  simUrl: string | null;
  hasSimulation: boolean;
  /** Layout canvas size; the overlay layers share this viewBox with the static SVG. Zero when the diagram has no board yet. */
  canvas: { w: number; h: number };
}
