/**
 * Local prop types for the canvas kit (DS5), mirroring the minimal shapes the
 * kit needs from dms-engine's v3 schema — `dms-engine/src/types/v3/graph.ts`
 * and `common.ts` — without importing the (private) engine package.
 *
 * SPEC GAP: `common.ts`'s `HealthToken` (`ok | warn | critical | info | accent
 * | muted`) is a generic decoration/color token, not the runtime health FSM
 * that UI_UX_SPEC §5.3 draws on the canvas (`ok | warn | critical | down |
 * recovering`). This file defines `HealthState` for that FSM instead of
 * reusing `HealthToken` — see the DS5 report.
 */

/** HLD node types the `Node` component (§5.2) renders. Matches `NodeType`
 * from graph.ts minus the DSA (`node`, `cell`) and LLD (`class`, `interface`,
 * `enum`) members, which get their own components (§5.7). */
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
  | 'external'
  | 'subSystem';

/** Replication / HA role of a node (§8.1 `NodeRole`). */
export type NodeRole = 'primary' | 'replica' | 'leader' | 'follower' | 'active' | 'standby';

/** The canvas health state machine (§5.3). */
export type HealthState = 'ok' | 'warn' | 'critical' | 'down' | 'recovering';

/** Link protocol (§8.3 `LinkProtocol`): sets the stroke style (§5.4). */
export type LinkProtocol = 'sync' | 'async' | 'stream';

/** DSA cell state (§5.7). */
export type DsaCellState = 'default' | 'active' | 'compare' | 'visited' | 'done' | 'error';

/** LLD member visibility glyph (§8.5 `Visibility`). */
export type LldVisibility = 'public' | 'private' | 'protected' | 'package';

/** LLD relation notation (§8.5 `LldRelation`, §5.7). */
export type LldRelation = 'inherits' | 'implements' | 'composes' | 'aggregates' | 'associates' | 'depends';

/** A node's meter kind (§5.2: utilization / cache hit ratio / queue backlog / replication lag). */
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

export interface LldField {
  name: string;
  type: string;
  visibility?: LldVisibility;
  static?: boolean;
}

export interface LldParam {
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

/** Node geometry (§5.2): 144×72 desktop, 104×64 phone. */
export const NODE_WIDTH = 144;
export const NODE_HEIGHT = 72;
export const NODE_WIDTH_PHONE = 104;
export const NODE_HEIGHT_PHONE = 64;
