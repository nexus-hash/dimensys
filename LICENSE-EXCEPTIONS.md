# License Exceptions

This repository is licensed under the GNU Affero General Public License v3 (AGPL-3.0), as detailed in the `LICENSE` file.

## Exceptions

The following are output from the private Dimensys engine and are **not** covered by the AGPL-3.0 license:

- `public/engine/` — Static assets synced from the engine's (pre-v3) build: CS concept content read by `app/concepts/`, plus a leftover icon set
- `data/engine/` — Synced public view-data documents and the compiled sim runtime worker bundle, served to the browser by this repo's own route handlers (`app/solutions/[id]/`, `app/engine/runtime/`)
- `server-data/engine/` — Synced server-only sources, read only from Route Handlers and never served to the browser

These are:
- **Copyright © Soumya Ranjan Tripathy, all rights reserved**
- Produced by the private Dimensys engine
- Excluded from distribution with this repository
- Gitignored and not included in version control

The sim runtime worker bundle under `data/engine/runtime/` ships only as compiled, minified output — a separate program that communicates with the AGPL-licensed app in this repository solely through a documented, versioned `postMessage` protocol (`app/(components)/player/worker/protocol.ts`). It is not linked or bundled into the app's own code.

The source code under the AGPL-3.0 license is everything else in this repository: the hand-written application shell, the player UI (renderer, chrome, store, worker client), and the rest of the interface that reads and renders the engine's output. The private engine itself is not included in this repository.
