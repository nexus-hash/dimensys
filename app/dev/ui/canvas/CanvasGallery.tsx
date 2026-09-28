'use client';

import * as React from 'react';
import { DevUiHeader } from '../DevUiChrome';
import {
  Board,
  Node,
  Link,
  SubsystemFrame,
  DsaCell,
  PointerMarker,
  LldCard,
} from '@/app/(components)/canvas';
import type { HealthState, LeafNodeType } from '@/app/(components)/canvas';

const NODE_TYPES: LeafNodeType[] = [
  'client',
  'lb',
  'apiGateway',
  'server',
  'worker',
  'orchestrator',
  'cache',
  'cdn',
  'db',
  'objectStore',
  'queue',
  'messageBus',
  'cloud',
  'external',
];

const HEALTH_STATES: HealthState[] = ['ok', 'warn', 'critical', 'down', 'recovering'];

const HEALTH_LABEL: Partial<Record<HealthState, string>> = {
  warn: 'p99 640 ms',
  critical: 'err 38%',
  down: 'DOWN',
  recovering: 'warming 42%',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 border-b border-line-hairline pb-2 text-title-2 text-ink-primary">{title}</h2>
      {children}
    </section>
  );
}

function NodeGrid() {
  const colW = 210;
  const rowH = 150;
  const cols = HEALTH_STATES.length + 1; // type label column + one per state
  const rows = NODE_TYPES.length;
  const width = colW * cols;
  const height = rowH * rows + 40;

  return (
    <Board id="gallery-nodes" label="Every node type by health state" viewBox={`0 0 ${width} ${height}`} className="canvas-surface w-full" style={{ minHeight: height }}>
      {HEALTH_STATES.map((state, c) => (
        <text
          key={state}
          x={colW * (c + 1) + colW / 2}
          y={24}
          textAnchor="middle"
          className="cv-lld-stereotype"
          fill="var(--color-ink-muted)"
        >
          {state}
        </text>
      ))}
      {NODE_TYPES.map((type, r) => (
        <React.Fragment key={type}>
          <text x={16} y={40 + rowH * r + rowH / 2} className="cv-lld-stereotype" fill="var(--color-ink-muted)">
            {type}
          </text>
          {HEALTH_STATES.map((state, c) => (
            <Node
              key={`${type}-${state}`}
              boardId="gallery-nodes"
              id={`${type}-${state}`}
              type={type}
              variant={type === 'client' ? 'web' : undefined}
              label="API Service"
              sublabel={`${type} · ×2`}
              role={c === 0 ? 'primary' : undefined}
              meter={
                type !== 'client'
                  ? { kind: 'util', value: 0.62, text: '62%', severity: 'ok' }
                  : undefined
              }
              health={state}
              healthLabel={HEALTH_LABEL[state]}
              pulsing={state === 'critical'}
              x={colW * (c + 1) + colW / 2}
              y={40 + rowH * r + rowH / 2}
            />
          ))}
        </React.Fragment>
      ))}
    </Board>
  );
}

function NodeStates() {
  return (
    <Board id="gallery-states" label="Selection, hover, focus and dimmed states" viewBox="0 0 900 220" className="canvas-surface w-full" style={{ minHeight: 220 }}>
      <Node boardId="gallery-states" id="s-default" type="server" label="Default" sublabel="server · ×1" x={110} y={100} />
      <Node boardId="gallery-states" id="s-selected" type="server" label="Selected" sublabel="server · ×1" selected x={330} y={100} />
      <Node boardId="gallery-states" id="s-dimmed" type="server" label="Dimmed" sublabel="server · ×1" dimmed x={550} y={100} />
      <Node
        boardId="gallery-states"
        id="s-replicas"
        type="server"
        label="Replicas"
        sublabel="server · ×4"
        replicas={4}
        x={780}
        y={100}
      />
    </Board>
  );
}

function LinksSection() {
  return (
    <Board id="gallery-links" label="Link styles" viewBox="0 0 900 420" className="canvas-surface w-full" style={{ minHeight: 420 }}>
      <Node boardId="gallery-links" id="l-a1" type="lb" label="LB" x={80} y={40} />
      <Node boardId="gallery-links" id="l-b1" type="server" label="API" x={400} y={40} />
      <Link boardId="gallery-links" id="link-sync" d="M152,40 L328,40" protocol="sync" label="sync" labelPosition={{ x: 240, y: 40 }} />

      <Node boardId="gallery-links" id="l-a2" type="server" label="API" x={80} y={130} />
      <Node boardId="gallery-links" id="l-b2" type="queue" label="Queue" x={400} y={130} />
      <Link boardId="gallery-links" id="link-async" d="M152,130 L328,130" protocol="async" label="async" labelPosition={{ x: 240, y: 130 }} />

      <Node boardId="gallery-links" id="l-a3" type="server" label="API" x={80} y={220} />
      <Node boardId="gallery-links" id="l-b3" type="messageBus" label="Bus" x={400} y={220} />
      <Link boardId="gallery-links" id="link-stream" d="M152,220 L328,220" protocol="stream" label="stream" labelPosition={{ x: 240, y: 220 }} />

      <Node boardId="gallery-links" id="l-a4" type="server" label="API" x={80} y={310} />
      <Node boardId="gallery-links" id="l-b4" type="db" label="DB" x={400} y={310} />
      <Link
        boardId="gallery-links"
        id="link-bad"
        d="M152,310 L328,310"
        protocol="sync"
        bad
        label="err 42% · retry ×2.1"
        labelHot
        labelPosition={{ x: 240, y: 310 }}
      />

      <Node boardId="gallery-links" id="l-a5" type="server" label="API" x={600} y={40} />
      <Node boardId="gallery-links" id="l-b5" type="db" label="DB" x={860} y={40} />
      <Link boardId="gallery-links" id="link-bi" d="M672,40 L788,40" protocol="sync" bidirectional label="bi" labelPosition={{ x: 730, y: 40 }} />

      <Node boardId="gallery-links" id="l-a6" type="server" label="API" x={600} y={130} />
      <Node boardId="gallery-links" id="l-b6" type="cache" label="Cache" x={860} y={130} />
      <Link boardId="gallery-links" id="link-hl" d="M672,130 L788,130" protocol="sync" highlighted label="highlighted" labelPosition={{ x: 730, y: 130 }} />

      <Node boardId="gallery-links" id="l-a7" type="server" label="API" x={600} y={220} />
      <Node boardId="gallery-links" id="l-b7" type="db" label="DB" x={860} y={220} />
      <Link boardId="gallery-links" id="link-dim" d="M672,220 L788,220" protocol="sync" dimmed label="dimmed" labelPosition={{ x: 730, y: 220 }} />

      <Node boardId="gallery-links" id="l-a8" type="server" label="API" x={600} y={310} />
      <Node boardId="gallery-links" id="l-b8" type="db" label="DB" x={860} y={310} />
      <Link
        boardId="gallery-links"
        id="link-cut"
        d="M672,310 L788,310"
        protocol="sync"
        partitioned
        cutPosition={{ x: 730, y: 310 }}
      />
    </Board>
  );
}

function FrameSection() {
  return (
    <Board id="gallery-frame" label="Group frame" viewBox="0 0 900 200" className="canvas-surface w-full" style={{ minHeight: 200 }}>
      <SubsystemFrame boardId="gallery-frame" id="frame-cluster" label="Key Generation Service" x={60} y={50} width={780} height={130} />
      <Node boardId="gallery-frame" id="frame-inner-1" type="worker" label="KGS Worker" x={200} y={115} />
      <Node boardId="gallery-frame" id="frame-inner-2" type="server" label="Node B" x={420} y={115} />
      <Node boardId="gallery-frame" id="frame-inner-3" type="db" label="Key Pool" x={640} y={115} />
    </Board>
  );
}

function DsaSection() {
  const values = [4, 8, 15, 16, 23, 42];
  return (
    <Board id="gallery-dsa" label="DSA cells and markers" viewBox="0 0 720 140" className="canvas-surface w-full" style={{ minHeight: 140 }}>
      {values.map((v, i) => (
        <DsaCell
          key={i}
          id={`cell-${i}`}
          value={v}
          x={60 + i * 100}
          y={90}
          state={i === 1 ? 'active' : i === 2 ? 'compare' : i === 3 ? 'visited' : i === 4 ? 'done' : i === 5 ? 'error' : 'default'}
        />
      ))}
      <PointerMarker id="m-i" label="i" x={160} y={90} stackIndex={0} />
      <PointerMarker id="m-j" label="j" x={260} y={90} stackIndex={0} />
      <PointerMarker id="m-k" label="k" x={260} y={90} stackIndex={1} />
    </Board>
  );
}

function LldSection() {
  // Rendered at 1:1 — a fixed pixel `style` (matching the viewBox exactly),
  // not `className="w-full"`, so the board never gets CSS-stretched to the
  // gallery's much wider content column the way the diagram sections above
  // it deliberately are. That stretch was blowing this single small card up
  // to several times its native size (huge text, rows overflowing even
  // further past the already-too-narrow card). `width={250}` is wide enough
  // for this card's longest row so the demo shows the untruncated happy
  // path; `LldCard` itself still truncates defensively for any content that
  // wouldn't fit.
  return (
    <Board id="gallery-lld" label="LLD UML card" viewBox="0 0 270 220" className="canvas-surface" style={{ width: 270, height: 220 }}>
      <LldCard
        id="card-url"
        name="UrlShortener"
        x={10}
        y={10}
        width={250}
        fields={[
          { name: 'store', type: 'KeyValueStore', visibility: 'private' },
          { name: 'counter', type: 'int', visibility: 'protected', static: true },
        ]}
        methods={[
          { name: 'shorten', params: [{ name: 'url', type: 'string' }], returns: 'string', visibility: 'public' },
          { name: 'resolve', params: [{ name: 'code', type: 'string' }], returns: 'string', visibility: 'public' },
        ]}
      />
    </Board>
  );
}

export function CanvasGallery() {
  return (
    <div className="min-h-screen bg-surface-page px-6 py-8 text-ink-primary">
      <DevUiHeader
        current="/dev/ui/canvas"
        title="DS5 — Canvas visual kit gallery"
        description="Development only (404s in production). Every node type × health state, link styles, group frames, DSA
            cells, markers and an LLD card, in both themes."
      />

      <Section title="Node anatomy — every type × every health state">
        <NodeGrid />
      </Section>

      <Section title="Selection, hover, focus, dimmed, replicas">
        <NodeStates />
      </Section>

      <Section title="Links">
        <LinksSection />
      </Section>

      <Section title="Group frames">
        <FrameSection />
      </Section>

      <Section title="DSA cells and pointer markers">
        <DsaSection />
      </Section>

      <Section title="LLD UML card">
        <LldSection />
      </Section>
    </div>
  );
}
