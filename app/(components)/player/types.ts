/**
 * Placeholder view-data shape for the player skeleton (T3.1).
 *
 * TODO: the real view-data shape is defined by the runtime contract between
 * the app and the (private) build tool that produces it; this file just
 * copies the handful of fields the skeleton and its tests need to compile
 * today, loosely and without depending on anything private. Replace/widen
 * this once that contract lands.
 *
 * Drift guard: `VIEW_DATA_MAJOR` is checked against the loaded document's
 * `build.version` major when a diagram is loaded (T3.13). A major bump on
 * the producing side means this file must be revisited.
 */

/** Major version this mirror was written against (`build.version`). */
export const VIEW_DATA_MAJOR = 3;

/** Build stamp. */
export interface BuildInfo {
  version: string;
  /** `sha256:<hex>` of the source document. Doubles as a cache-buster for the JSON route. */
  hash: string;
  builtAt: string;
}

/** Node box; `x`/`y` are the center, in layout units. */
export interface NodeBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Point = [number, number];

export interface LinkRoute {
  points: Point[];
}

/** One graph level's computed layout; subsystems nest. */
export interface ViewLayout {
  canvas: { w: number; h: number };
  nodes: { [nodeId: string]: NodeBox };
  links: { [linkId: string]: LinkRoute };
  subSystems?: { [subSystemId: string]: ViewLayout };
}

export interface ViewLayouts {
  desktop: ViewLayout;
  mobile?: ViewLayout;
}

/**
 * The slice of `public/diagrams/<id>.json` the server-rendered frame and the
 * bootstrap need. The full document is fetched by the worker, not passed
 * through React props.
 *
 * TODO(T3.2/T3.13): widen with `graph`, `metadata`, `simulation.hud`,
 * `scenarios`, `walkthroughs` as the renderers need them.
 */
export interface ViewData {
  id: string;
  build: BuildInfo;
  layouts: ViewLayouts;
  metadata: { title: string; revision?: number };
  /** Walkthrough states, precomputed per step. Loosely typed until T3.11. */
  walkthroughStates: { [walkthroughId: string]: unknown[] };
  /** Present only for simulated diagrams. */
  hasSimulation: boolean;
}

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

/** Health tokens as published by the runtime's metrics snapshot. */
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
 * serialisable. Everything large (the full view-data document, libraries)
 * is fetched by the worker from the static JSON route.
 */
export interface PlayerBootstrap {
  diagramId: string;
  revision: number;
  /** `build.hash`; appended to the JSON URL so CDN caches can be immutable. */
  hash: string;
  /** Static JSON route for the full view-data document (T3.13), e.g. `/solutions/<id>/diagram.json?h=…`. */
  diagramUrl: string;
  /** Hashed URL of the runtime worker bundle under `/engine/runtime/`, or `null` when absent (no runtime, no sim). */
  runtimeUrl: string | null;
  hasSimulation: boolean;
  /** Layout canvas size; the overlay layers share this viewBox with the static SVG. */
  canvas: { w: number; h: number };
}
