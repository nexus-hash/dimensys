/**
 * Local prop types for the canvas kit (DS5): the minimal, neutral shapes the
 * kit needs to render, defined here so the public app never imports the
 * (private) build tool's own types.
 *
 * SPEC GAP: a generic decoration/color token (`ok | warn | critical | info |
 * accent | muted`) is not the same as the runtime health state machine the
 * canvas draws (`ok | warn | critical | down | recovering`). This file
 * defines `HealthState` for that FSM rather than reusing the decoration
 * token — see the DS5 report.
 */

/** HLD node types the `Node` component renders. Excludes the DSA (`node`,
 * `cell`) and LLD (`class`, `interface`, `enum`) members, which get their
 * own components. */
export type HldNodeType =
  | 'client'
  | 'lb'
  | 'apiGateway'
  | 'server'
  | 'worker'
  | 'orchestrator'
  | 'cache'
  | 'cdn'
  | 'db'
  | 'objectStore'
  | 'queue'
  | 'messageBus'
  | 'cloud'
  | 'external';

/** Replication / HA role of a node. */
export type NodeRole = 'primary' | 'replica' | 'leader' | 'follower' | 'active' | 'standby';

/** The canvas health state machine. */
export type HealthState = 'ok' | 'warn' | 'critical' | 'down' | 'recovering';

/** Link protocol: sets the stroke style. */
export type LinkProtocol = 'sync' | 'async' | 'stream';

/** DSA cell state. */
export type DsaCellState = 'default' | 'active' | 'compare' | 'visited' | 'done' | 'error';

/** LLD member visibility glyph. */
export type LldVisibility = 'public' | 'private' | 'protected' | 'package';

/** A node's meter kind. */
export type NodeMeterKind = 'util' | 'hit' | 'backlog' | 'lag';

export interface NodeMeter {
  kind: NodeMeterKind;
  /** 0–1 fill ratio. */
  value: number;
  /** Rendered mono text, e.g. "82%", "lag 820 ms". */
  text: string;
  /** Meter fill switches to the signal color above the warn/critical threshold. */
  severity?: 'ok' | 'warn' | 'critical';
}

/**
 * Every HLD node gets a meter row (FID) — which reading depends on the node
 * shape: `cache` shows its hit ratio, `queue`/`messageBus` show their
 * message backlog (`queueDepth` — the simulator publishes a consumer's own
 * *drain time* nowhere, only the depth behind it, per `src/sim/behaviors/
 * queue.ts`'s "Consumer lag is `queueDepth`", so this reads that, not a
 * fabricated seconds figure), everything else shows utilization. `client`
 * (a traffic source with no server-side behavior to meter) gets no meter
 * row at all — `null` tells a caller to omit the `meter` prop entirely,
 * same as the design's source nodes.
 */
export function meterKindForType(form: string): NodeMeterKind | null {
  if (form === 'client') return null;
  if (form === 'cache') return 'hit';
  if (form === 'queue' || form === 'messageBus') return 'backlog';
  return 'util';
}

export interface LldField {
  name: string;
  type: string;
  visibility?: LldVisibility;
  static?: boolean;
}

interface LldParam {
  name: string;
  type: string;
}

export interface LldMethod {
  name: string;
  params?: LldParam[];
  returns?: string;
  visibility?: LldVisibility;
  static?: boolean;
}

/** Node geometry (desktop). */
export const NODE_WIDTH = 144;
export const NODE_HEIGHT = 72;
