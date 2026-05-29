# Engine Architecture Shortcomings

This document tracks the identified drawbacks in the current Universal Diagram Engine specification and serves as a checklist for resolving them.

## 1. The Auto-Layout "Spaghetti" Problem & Semantic Flow
* **Flaw**: Pure physics-based engines (Force-Directed) don't respect "Architectural Flow" (e.g., Clients on the left, DBs on the right) and can cause object overlap.
* **Impact**: Diagrams look messy, unstructured, and objects might clip into each other.
* **Resolution**: 
    1. **Determinism**: Introduced `layoutSeed` to guarantee consistent renders.
    2. **Algorithmic Flow**: We will use a **Layered Graph Algorithm (Sugiyama Framework / Dagre)**. This reads the `layer` from `layoutHints` (e.g., Client=0, LB=1, DB=3) and guarantees a strict Left-to-Right or Top-to-Bottom flow.
    3. **Collision Avoidance**: Layered algorithms inherently allocate non-overlapping bounding boxes for each node, solving the collision issue completely.
* **Status**: 🟢 Resolved

## 2. Scenario State Leakage
* **Flaw**: Scenarios apply `actions` (property overrides) without defining state machine rules.
* **Impact**: Switching between multiple scenarios may cause visual state to "leak" (e.g., a node stays red from Scenario A when viewing Scenario B).
* **Resolution**: Implemented a **Two-Phase Base State Reversion**. The engine preserves the original, pre-processed JSON as the immutable "Base State". When switching from Scenario A to Scenario B, the engine calculates the deltas and animates properties from Scenario A *back* to the Base State, and *then* animates from the Base State to Scenario B.
* **Status**: 🟢 Resolved

## 3. 3D Link Collision & Routing
* **Flaw**: Links are defined as point-to-point connections, which in 3D space will clip through extruded node geometries.
* **Impact**: A link drawn from a client to a backend server will visually slice directly through the Load Balancer model in the center.
* **Resolution**: Leveraged Dagre's built-in Edge Routing phase. The layout engine extracts exact intersection-avoiding waypoints (`edge.points`) calculated to skirt around the 3D mathematical bounding boxes, guaranteeing clean orthogonal paths without collisions.
* **Status**: 🟢 Resolved

## 4. Infinite Recursion Performance
* **Flaw**: The `subSystem` composite pattern allows for infinite nesting of layouts.
* **Impact**: Attempting to render an entire global architecture (Regions -> VPCs -> Clusters -> Servers) simultaneously will crash the WebGL context (React Three Fiber) due to excessive draw calls.
* **Resolution**: Implemented **Chunked Rendering with Explosion Transitions**. The entire JSON's math is calculated upfront, but 3D objects are strictly lazy-mounted. A `subSystem` is rendered as an opaque bounding box initially. When clicked, it triggers an "Explosion Effect" where the parent architecture unmounts from WebGL memory, and the inner `subSystem` mounts and renders. Rendering is processed entirely client-side in single-layer chunks.
* **Status**: 🟢 Resolved

## 5. Bidirectional Traffic Ambiguity
* **Flaw**: Bidirectional links (`type: "bi"`) have a singular `trafficRate` value.
* **Impact**: It is impossible to visualize asymmetric traffic flow (e.g., a small request query vs. a massive data payload response).
* **Resolution**: Replaced the scalar `trafficRate` with a polymorphic `traffic` attribute in the JSON specification. It accepts either a flat `Number` (for standard unidirectional flow) or an `Object` (e.g., `{ forward: 80, backward: 20 }`) to precisely animate asymmetric bidirectional flows like WebSockets.
* **Status**: 🟢 Resolved

## 6. Dynamic Canvas & Camera Framing
* **Flaw**: The engine has no way to know how large the generated 3D scene will be until it finishes calculating.
* **Impact**: Large diagrams will overflow the screen, and small diagrams will be tiny dots in the center.
* **Resolution**: The engine calculates the true physical `masterCanvas` (the `minX/maxX/minY/maxY` spread of all objects) and adds 15% padding. It passes these exact dimensions to the 3D Camera, which computes a custom `zoomFactor` or Z-axis transition to dynamically frame the architecture perfectly upon load or drill-down.
* **Status**: 🟢 Resolved
