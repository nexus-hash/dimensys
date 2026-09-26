# Player architecture (T3.1)

Status: proposed, 2026-09-26. Skeleton: `app/(components)/player/`, `app/(server)/engine/`, `/dev/player`.
Sources: DETAILED_PLAN §3.3, §4, §8.3 · TASK_PLAN Wave 2–3 · UI_UX_SPEC §4, §5, §6.3, §6.16, §10, §15 · engine `v3` (`src/sim`, `src/scenario`, `src/compile`, `src/types/v3/compiled.ts`).

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Where the player and browser runtime live | **Player UI in this repo (AGPL). Sim runtime = engine-built, minified worker bundle** shipped as compiled output in `public/engine/runtime/`, loaded by URL, spoken to only through a JSON message protocol. No `@dimensys/player` package. |
| 2 | State store | **Hand-rolled external store, one per player instance**, read with `useSyncExternalStore`. No new dependency. |
| 3 | Server/client boundary | **`<DiagramPlayer>` is a Server Component.** One client boundary (`<PlayerIsland>`) wraps server-rendered children. The static SVG is never hydrated; the overlay shares its viewBox. |
| 4 | Data loading | **Fully static `/solutions/[id]`** (`generateStaticParams`, `dynamicParams = false`), `fs` reads from `data/engine/` at build time. The worker fetches the full document from a force-static JSON route. Aliases become `next.config` redirects. `server-data/engine/` is read only in Route Handlers. |
| 5 | Worker protocol | Versioned command/message protocol (`worker/protocol.ts`). Columnar transferable frames at 10 Hz. The worker stamps action times, which keeps the log deterministic. Restart once and replay, then show the error card. |
| 6 | Folder layout | `app/(components)/player/` (UI, store, protocol), `app/(server)/engine/` (server-only readers), `app/solutions/[id]/` (route, T3.13). |

## 1. Where the player and the runtime live

**What has to reach the browser:** the React UI (chrome, SVG renderer, overlay, HUD) and the sim runtime: engine `src/sim`, `src/scenario`, `src/patch`, `src/expr` and `src/resolve`. These are pure TS with no Node APIs, and the runner events are already plain serialisable objects. What must *not* reach the browser (§8.3, §3.3 IP note): grading, reference solutions, puzzle answers, `interview` blocks and the authoring pipeline. Browser code can always be copied, so what matters is keeping the *source* and the *server-side secrets* private.

| Option | For | Against |
|---|---|---|
| **(a) Engine builds a worker bundle** into `dist-v3/public/runtime/sim-worker.<hash>.js`. The manifest lists it in `staticAssets`, sync copies it to `public/engine/runtime/`, and the app loads it with `new Worker(url, { type: 'module' })` | No engine source ever enters the public repo or the Next bundle graph. The runtime is a **separate program** talking over `postMessage`: an arm's-length boundary under AGPL, not linking. It already fits the manifest contract (`staticAssets`) and `LICENSE-EXCEPTIONS.md` (`public/engine/`). A missing bundle degrades to the static frame, so outside contributors can still build the app. Hashed file name → immutable caching, and no stale worker in `next dev` | The engine needs a bundler (esbuild) to produce one self-contained file. The protocol types exist twice (app + engine) and are kept in step by `PROTOCOL_VERSION`. Engine changes to the runtime need an engine rebuild (already true today via `dev-engine.sh`) |
| (b) Private npm package `@dimensys/player` (UI + runtime) from a private registry or git, installed in CI | Matches DETAILED_PLAN §4.3's wording. One import, typed | The public repo **can't build or type-check** without the private package, which hurts outsiders and the stars/credibility aim (§8.1). The private code is *bundled into* the AGPL app, so the "combined work" question applies, and it gets worse once outside contributions land. It needs a registry token in every CI job and a local `npm link` dance for `dev-engine.sh`. The leak guard can't tell "allowed private minified code" from a leak |
| (c) Runtime source vendored into the app | Simplest | Publishes the simulation models' source. Rejected |

**Recommendation: (a).** The React player (renderer, chrome, store, worker *client*) lives in this repo under AGPL. It is visuals and interaction, which §8.3 accepts can be copied, and DS5 already put the canvas kit here. The runtime ships only as compiled, minified output under the existing "generated output, all rights reserved" exception.

Consequences and rules:
- **The app never imports engine code**, types included. The shapes it needs are mirrored in `player/types.ts` (as `canvas/types.ts` already does) and guarded by `COMPILED_MAJOR` against `compiled.engineVersion`.
- **No source maps with `sourcesContent`** ship in `public/engine/runtime/`, and the bundle carries a one-line "© … all rights reserved, generated" banner (not the engine LICENSE text the leak guard greps for).
- `runtimeUrl` comes from the synced manifest at build time. It is `null` when no bundle exists, and then the player is the static frame plus rails (`sim.status = 'unavailable'`).
- Local dev: `dev-engine.sh` already rebuilds and syncs on save, and the new file hash reloads the worker. No change to the Vercel prebuilt flow: the bundle is just another synced static asset.

## 2. State store

**What it holds** (`store/playerStore.ts`): `mode`, `selection`, `sim` (status, playing, speed, key tables, latest columnar frame, `frameNo`), `story` (scenario, runner status, duration), `walkthrough` (id, step) and `actions` (the canonical, worker-stamped share log). The camera stays out of it. Camera state is per-frame pointer state and belongs in a ref inside the canvas component (T3.3/T3.4), which publishes only settled values if the URL needs them.

**Decision:** a ~40-line external store (`getState` / `setState` / `subscribe`), **one instance per mounted player**, created in `<PlayerStoreProvider>` with `useState(() => …)` and shared through context. React reads slices with `usePlayerStore(selector)` (`useSyncExternalStore`). Hot paths read it imperatively: the particle rAF loop and the worker bridge call `getState()`/`subscribe()` and never cause React renders. It uses the same pattern as `ui/toastStore.ts`, minus the module singleton (a module singleton would leak between SSR requests and break two players on one page: hero + embed).

**Trade-offs.** Zustand would give the same thing in ~1 KB, plus middleware we don't need. It isn't worth a dependency or the review. Redux or React context state is too heavy or re-renders too much at 10 Hz. If selector ergonomics become painful (T3.8/T3.9), add a `useShallow`-style equality helper locally first.

**10 Hz discipline:** the store keeps only the *latest* frame. HUD sparkline history (60 s = 600 samples per HUD metric) lives in ring buffers owned by the HUD component (T3.8), fed via `subscribe`. Selectors return primitives or slices the store replaces only on change.

**URL state (T3.12):** the store is the source of truth, and the URL is a projection. The URL is decoded once on mount, then written with `history.replaceState` (debounced; Next 16 syncs the native History API with `useSearchParams`). The encoder reads `diagramId`, `revision`, `mode`/`story`/`walkthrough`, `sim.frame.t` and `actions`.

## 3. Server/client boundary

```
app/solutions/[id]/page.tsx              Server, prerendered at build
└─ <DiagramPlayer diagram runtimeUrl>    Server: builds a small PlayerBootstrap
   └─ <PlayerIsland bootstrap>           'use client': the one boundary; store (+ bridge from T2.13)
      ├─ server children (never hydrated): shell frame (T3.16), <StaticBlueprint> SVG (T3.2),
      │                                    rail markdown, detail sections (T3.6)
      └─ client leaves: ModeSwitcher, HUD, Timeline, Toolbox, InteractiveLayer (T3.3), ...
```

- **Zero client JS for a readable diagram.** The static SVG (nodes, links, labels, subsystems, from `layouts.desktop`) is a server child of the island. It ships as HTML, is the LCP element (§10) and is the loading state (§6.16). Controls render in their resting state and become live on hydration.
- **Props across the boundary are small:** `PlayerBootstrap` (ids, revision, hash, JSON URL, runtime URL, canvas size). The full compiled document is **not** passed as props, which would put it in the HTML and again in the RSC payload. The worker fetches it (§4). Client leaves that need content (walkthrough states, HUD config) get only their own slice as props from the server parent.
- **Alignment:** one coordinate space. The static SVG and the overlay (an SVG for rings, meters, chips and hit targets, plus a Canvas2D for particles) share `viewBox = 0 0 canvas.w canvas.h` and sit in one container that carries the single camera transform (T3.3/T3.4). Nothing is positioned by measuring the DOM.
- **Signals are drawn on the overlay, never by mutating static DOM.** Health rings, glyphs, meters and metric chips are drawn on the overlay at the node's box. Dimming and highlighting of static elements (walkthrough 20 %, selection) come from a scoped `<style>` the island renders against stable `data-el="<id>"` attributes, which T3.2 must emit. React never touches the server-rendered SVG.
- **Worker start:** lazily after hydration (`requestIdleCallback`, falling back to `setTimeout`), then `init` in free play. It is paused while `document.hidden`. It is never in the initial JS budget (§10: < 180 KB).
- **Streaming:** the page is static, so nothing streams at request time. Leaves that read `useSearchParams` sit under a `<Suspense>` so the rest prerenders. Share links open on the healthy static frame and then replay the action log in the worker. This matches §15.6 ("opens healthy"). The cost is a brief healthy→meltdown catch-up on a meltdown link, which is acceptable. Walkthrough steps (`?v=&st=`) apply synchronously on hydration from the precompiled states, with no replay.

## 4. Data loading

- **Public data** (`app/(server)/engine/publicData.ts`, `import 'server-only'`): reads `data/engine/manifest.json`, `catalog.json` and `diagrams/<id>.json` with `fs` from `process.cwd()`, wrapped in React `cache()` so `generateMetadata` and the page share one read. IDs are looked up in the manifest list and never joined into a path unchecked. `loadPlayerDiagram` returns the `PlayerDiagram` slice, and a major-version mismatch fails the build.
- **Route:** `app/solutions/[id]/page.tsx` has `generateStaticParams()` from the manifest and `dynamicParams = false`, so an unknown id is a 404 with no runtime `fs` and no file tracing needed. A new diagram needs a rebuild, which is already how content ships.
- **Full document for the worker:** `app/solutions/[id]/diagram.json/route.ts`, `dynamic = 'force-static'` plus the same `generateStaticParams`. It emits the whole public compiled JSON as a static file. The URL carries `?h=<hash prefix>` so it can be cached forever. Library documents come from a sibling static route. There is no public copy under `public/`; `data/engine/` stays the single synced source.
- **Revision and aliases (§23.4, §25):** catalog `aliases` (and `/2d/[problemId]`) become **permanent redirects in `next.config.ts` `redirects()`**, built from `data/engine/catalog.json` at config load and tolerant of a missing file. Config redirects keep the query string, so old share links survive, which an SSG page-level redirect can't do. `r` older than the current `revision`: no archived revisions. Replay against the current document. If an action no longer applies (`SIM_UNKNOWN_REF` / `SIM_BAD_TARGET`), drop the rest of the log, stay healthy, and show a toast: "This link was made for an older version of the diagram."
- **Server-only data** (`app/(server)/engine/serverData.ts`, `import 'server-only'`): `server-data/engine/` (full sources with `interview`, puzzles with secrets) is read **only from Route Handlers** (`app/api/**/route.ts`), which return derived results (a grade, today's public puzzle half on or after `publishOn`), never raw documents. Pages and layouts must not import it, because a Server Component's props end up in the RSC payload. The functions that read it get `outputFileTracingIncludes` entries, and nothing under `server-data/` is ever under `public/` (T2.5).

## 5. Worker protocol (outline for T2.13)

App-side types: `player/worker/protocol.ts`. The engine keeps a copy, and `PROTOCOL_VERSION` is checked in the handshake.

| Direction | Message | Notes |
|---|---|---|
| → worker | `init {protocol, diagramUrl, libraryUrls, mode: free\|scenario, scenarioId?, restore?: {actions, choices, t}, paused?}` | The worker fetches the JSON itself. `restore` = share-link replay via engine `replay()` / runner `choices` |
| → | `play` · `pause` · `setSpeed {0.5\|1\|2\|4}` · `reset` | `reset` clears the log |
| → | `applyAction {tool, target, value}` | No `t`: the worker applies it at the next tick boundary and answers `actionApplied {action:[t,…]}`. Only echoed actions enter the store's log |
| → | `choose {checkpointId, choiceId}` · `skip` · `continueCaption` · `seek {t}` · `dispose` | `seek` is scenario-only: restore the nearest runner snapshot (engine `SNAPSHOT_INTERVAL_SEC` = 5) and run forward |
| ← main | `ready {protocol, engineVersion, hash, tickMs, metricKeys, healthIds, keysEpoch}` | Fixes the column order of frames |
| ← | `keys {…, keysEpoch}` | After a patch changes the node or link set |
| ← | `frame {t, keysEpoch, metrics: Float64Array, health: Uint8Array, events: RunnerEvent[]}` @ 10 Hz | Columnar, sent in the transfer list (zero copy). Runner events are batched per frame |
| ← | `status {playing, speed, t, runner?, duration?}` · `ack {seq}` · `error {seq, code, message, fatal}` | Every command carries `seq` |

- **Pacing:** the worker owns the clock. It runs `ticks = elapsed × speed / tickMs` per timer slice (capped per slice so a slow phone drops speed, not correctness). Simulated time only moves by whole ticks.
- **Determinism:** seed comes from the document (`simulation.seed`) and is never put in the URL. Wall-clock time only decides *how many* ticks run, never *what* they compute. Actions are stamped with `sim.time` at a tick boundary. Share state = document revision + scenario + worker-stamped action log + checkpoint choices + `t`, which reproduces the run exactly. The engine's T2.9/T2.11 determinism tests cover the replay side.
- **Errors:** a non-fatal `error` rejects one command (the toast names it). `fatal`, `worker.onerror` or `messageerror` → terminate, restart **once** silently, and replay the log (§6.16). A second failure shows the inline error card, and the static frame stays. A protocol or hash mismatch on `ready` is fatal and gets no restart. Every inbound message goes through `isWorkerMessage`.

## 6. Folder layout and naming

```
app/(components)/player/          public AGPL player (this task: skeleton)
  index.ts                        server-safe exports
  DiagramPlayer.tsx               Server Component
  PlayerIsland.tsx                'use client' boundary
  types.ts                        mirrored compiled shapes + PlayerBootstrap
  store/playerStore.ts            pure store       store/PlayerStoreProvider.tsx  context + hooks
  worker/protocol.ts              message types    worker/bridge.ts (T2.13)       Worker client
  blueprint/  (T3.2)  overlay/ (T3.3)  shell/ (T3.16)  hud/ (T3.8)  breakit/ (T3.9)  walkthrough/ (T3.11)  url/ (T3.12)
app/(server)/engine/publicData.ts  serverData.ts   server-only readers
app/solutions/[id]/page.tsx, diagram.json/route.ts (T3.13)
app/dev/player/                    dev-only skeleton check (404 in production)
```

Components are PascalCase files, and hooks and pure modules are camelCase, matching `ui/` and `data/`. `app/solutions/` stops being generated in T3.13. Its `.gitignore`, eslint-ignore and `LICENSE-EXCEPTIONS.md` entries must be removed or narrowed then, because it becomes hand-written AGPL source.

## Owner decisions needed

1. **Accept the change to DETAILED_PLAN §4.3 / §8.3:** no private `@dimensys/player` package. The player UI is AGPL in this repo, and only the sim runtime ships privately, as a compiled worker bundle. The plan text needs updating if you agree.
2. **License wording:** extend `LICENSE-EXCEPTIONS.md` to `data/engine/`, `server-data/engine/` and `public/engine/runtime/`, with a sentence saying the runtime is a separate program that communicates with the app only through the documented message protocol. Consider having this wording reviewed, together with the employer clearance (§8.3).
3. **Engine dev dependency:** `esbuild` (or equivalent) in `dms-engine` to produce the single-file worker bundle. There is no app dependency change.
4. **Contributor policy** for the AGPL app (CLA or DCO), so outside contributions never constrain how you combine the app with the private runtime.
5. **Accept "minified, not secret"** for the simulation models: anything that runs in the browser can be read with effort. Only grading, answers, interviews and authoring stay server-side.

## Spec changes to report (docs outside this repo)

- DETAILED_PLAN §4.3 and §8.3: replace `@dimensys/player` with "player UI in the app (AGPL) + private compiled runtime worker".
- SCHEMA_V3 §23.3: the manifest `staticAssets` carries the runtime bundle (`public/runtime/sim-worker.<hash>.js` → `public/engine/runtime/…`). Optionally add `runtime: { url, protocol }` so the app doesn't have to pattern-match file names.
- TASK_PLAN T2.13: the deliverable includes the esbuild worker bundle and the engine copy of `protocol.ts`.
