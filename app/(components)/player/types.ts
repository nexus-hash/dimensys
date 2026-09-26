/**
 * App-side mirror of the compiled-output shapes the player reads (T3.1,
 * docs/PLAYER_ARCHITECTURE.md §4). The source of truth is the private
 * engine's `src/types/v3/compiled.ts` (SCHEMA_V3 §23); this file copies only
 * the fields the player needs, the same way `canvas/types.ts` mirrors the
 * graph types, so the public app never imports engine source.
 *
 * Drift guard: `COMPILED_MAJOR` is checked against
 * `CompiledDiagram.compiled.engineVersion` when a diagram is loaded (T3.13).
 * A major bump in the engine means this file must be revisited.
 */

/** Engine major version this mirror was written against (`compiled.engineVersion`). */
export const COMPILED_MAJOR = 3;

/** Build stamp (§23.2). */
export interface CompileInfo {
  engineVersion: string;
  /** `sha256:<hex>` of the source document. Doubles as a cache-buster for the JSON route. */
  hash: string;
  builtAt: string;
}

/** Node box; `x`/`y` are the center, in layout units (§23.2). */
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

/** One graph level's computed layout; subsystems nest (§23.2). */
export interface CompiledLayout {
  canvas: { w: number; h: number };
  nodes: { [nodeId: string]: NodeBox };
  links: { [linkId: string]: LinkRoute };
  subSystems?: { [subSystemId: string]: CompiledLayout };
}

export interface CompiledLayouts {
  desktop: CompiledLayout;
  mobile?: CompiledLayout;
}

/**
 * The slice of `public/diagrams/<id>.json` the server-rendered frame and the
 * bootstrap need. The full document is fetched by the worker, not passed
 * through React props (see PLAYER_ARCHITECTURE.md §3).
 *
 * TODO(T3.2/T3.13): widen with `graph`, `metadata`, `simulation.hud`,
 * `scenarios`, `walkthroughs` as the renderers need them.
 */
export interface PlayerDiagram {
  id: string;
  compiled: CompileInfo;
  layouts: CompiledLayouts;
  metadata: { title: string; revision?: number };
  /** Walkthrough states, precompiled per step (§23.2). Loosely typed until T3.11. */
  walkthroughStates: { [walkthroughId: string]: unknown[] };
  /** Present only for simulated diagrams. */
  hasSimulation: boolean;
}

/** One logged user action: `[t, tool, target, value]` (§23.4). */
export type UserAction = [number, string, string | null, number | string | boolean | null];

/** Decoded share URL (§23.4). Codec is T3.12. */
export interface ShareState {
  docId: string;
  r?: number;
  v?: string;
  st?: string;
  t?: number;
  a?: UserAction[];
}

/** Engine health tokens as published by `sim.metricsSnapshot().health` (§11.12). */
export type SimHealthToken = 'ok' | 'warn' | 'critical' | 'info' | 'accent' | 'muted';

/**
 * Serialisable runner event (engine `src/scenario/events.ts`). Mirrored
 * loosely: `kind` is the discriminant; T3.10 narrows the members it renders.
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
 * serialisable. Everything large (the full compiled document, libraries)
 * is fetched by the worker from the static JSON route.
 */
export interface PlayerBootstrap {
  diagramId: string;
  revision: number;
  /** `compiled.hash`; appended to the JSON URL so CDN caches can be immutable. */
  hash: string;
  /** Static JSON route for the full compiled diagram (T3.13), e.g. `/solutions/<id>/diagram.json?h=…`. */
  diagramUrl: string;
  /** Hashed URL of the engine-built worker bundle under `/engine/runtime/`, or `null` when absent (no engine, no sim). */
  runtimeUrl: string | null;
  hasSimulation: boolean;
  /** Layout canvas size; the overlay layers share this viewBox with the static SVG. */
  canvas: { w: number; h: number };
}
