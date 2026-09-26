# Motion

Motion tokens, a spring utility, choreography presets, `NumberRoll` and a
View Transitions helper — everything needed to give a signature moment its
motion without inventing new hard-coded timing values, and without breaking
that motion for anyone who has asked for less of it.

## Layout

| File | What it is |
|---|---|
| `tokens.ts` | Reads the duration/easing/spring CSS variables from `app/globals.css` at runtime (`durationMs`, `ease`, `springConfig`, plus `*Var` helpers for inline styles), with fallback constants for SSR/tests. |
| `spring.ts` | A pure-TS, rAF-driven, cancellable spring (`animateSpring`), plus `criticalDamping` and named presets built from the `spring-camera` / `spring-ui` tokens. |
| `reducedMotion.ts` | Re-exports `useReducedMotion` and adds the imperative `isMotionReduced` / `pickMotion` for non-React code. |
| `viewTransition.ts` | `runViewTransition` — wraps the platform `document.startViewTransition`, falling back to an instant swap when unsupported or motion is reduced. |
| `presets.ts` | `MOTION_PRESETS` — one preset per signature moment (table below), each with its full-motion stages and its reduced-motion variant. |
| `NumberRoll.tsx` | Tabular-digit live value; rolls smoothly on a large (10x+) jump, applies instantly otherwise and always under reduced motion. |

## Reduced motion

Every preset's `reduced` field is one of:
- **`fade`** — the full choreography collapses to a short, token-derived fade (no spring, no slide, no draw-in).
- **`steady`** — a pulse/spawn-cadence loop becomes a static end state instead.
- **`instant`** — the change applies with no transition at all.

This is driven by the same two signals everywhere in the app: the OS
`prefers-reduced-motion` media query, and the app's own `data-motion="off"`
override (`useReducedMotion` / `isMotionReduced`).

## Signature moments → presets

| Moment | Preset (`presets.ts` id) |
|---|---|
| Catalog card opens into the player | `card-to-player` — shared-element view-transition morph, chrome fades in after |
| A node goes critical | `node-critical` — ring draws in, glyph springs in, metric chip slides up |
| Requests on a link start failing | `requests-failing` — particles decelerate, recolor and fall away |
| A retry storm starts | `retry-storm` — hollow rings spawn at the retry rate |
| A component is killed | `kill` — ink flash, then desaturate + hatch fade in |
| A fix is applied and the system recovers | `recover` — particles re-color to the healthy flow color as the HUD delta counts down |
| Drilling into a subsystem | `drill-down` — camera spring, siblings fade, inner nodes stagger in |
| A checkpoint decision opens | `checkpoint-open` — canvas dims, card rises with a fade, choices stagger in |
| Switching player modes | `mode-switch` — chrome crossfade + slide, canvas untouched |
| Switching light/dark theme | `theme-switch` — view-transition crossfade |
| A live number updates | `number-roll` — instant tick; a 10x+ jump rolls (see `NumberRoll.tsx`) |
| A caption/narration card enters or leaves | `caption-inout` — rises and fades in, fades down and out |
| A share/copy action succeeds | `share-success` — a confirmation glyph springs in and settles |

Every moment named in the motion guidelines has a preset above; see
`/dev/ui/motion` for a live, replayable demo of each one in both motion
states.
