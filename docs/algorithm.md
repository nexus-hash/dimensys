# Layout Calculation Algorithm

This document details the exact mathematical steps the Universal Diagram Engine executes to translate a JSON specification into absolute `(X, Y)` coordinates, edge routing paths, and bounding boxes.

## 1. The Core Algorithm (Sugiyama Framework)

The engine implements a deterministic version of the Sugiyama Layered Graph drawing algorithm. The exact execution sequence is as follows:

### Step 1: Initialization & Determinism
```javascript
// 1. Initialize Pseudo-Random Number Generator with the JSON's layoutSeed
const prng = initializePRNG(json.layoutSeed || "default-salt");

// 2. Initialize the Directed Graph
const graph = new Graph({ directed: true });

// 3. Apply mathematical constraints from layoutSettings
graph.setGraph({
  rankdir: "LR", // Hardcoded: Flow is always Left-to-Right
  ranksep: json.layoutSettings.ranksep || 100,  // Distance between layers
  nodesep: json.layoutSettings.nodesep || 50,   // Distance between sibling nodes
  edgesep: json.layoutSettings.edgesep || 20    // Distance between parallel links
});
```

### Step 2: Recursive SubSystem Sizing (Bottom-Up)
```javascript
// Before mapping nodes, we must calculate the exact natural size of any nested subSystems.
json.layout.nodes.forEach(node => {
  if (node.type === "subSystem" && node.layout) {
    // 1. Recursively compute the natural bounding box of the internal architecture
    node.rawCanvas = calculateLayout(node.layout, layoutSettings, layoutSeed);
    
    // 2. The subSystem node's dimensions in the parent graph become the exact 
    // internal canvas size + 15% padding for the glass boundary walls.
    // We DO NOT artificially compress or scale the 3D models here.
    node.computedWidth = node.rawCanvas.width * 1.15;
    node.computedHeight = node.rawCanvas.height * 1.15;
  }
});
```

### Step 3: Node Assignment & Dimensioning
```javascript
// Import Engine-Level Constants (Not part of JSON)
import { ENGINE_CONSTANTS } from '@/lib/engine/constants';

// Map every node into the graph with exact dimensions
json.layout.nodes.forEach(node => {
  // Use dynamically calculated size for subSystems, otherwise use Constant
  const defaultDims = ENGINE_CONSTANTS.nodeDimensions[node.type] || { w: 100, h: 100 };
  
  const dims = {
    w: node.computedWidth || node.layoutHints?.width || defaultDims.w,
    h: node.computedHeight || node.layoutHints?.height || defaultDims.h
  };
  
  // Set node in graph. The algorithm uses this box to prevent overlap.
  graph.setNode(node.id, { 
    width: dims.w, 
    height: dims.h,
    rank: node.layoutHints?.layer // Force the node into a specific column/layer
  });
});
```

### Step 3: Edge Assignment
```javascript
// Map all connections
json.layout.links.forEach(link => {
  // Determine if the source and target are explicitly placed in the same layer
  const sourceNode = json.layout.nodes.find(n => n.id === link.from);
  const targetNode = json.layout.nodes.find(n => n.id === link.to);
  
  const isSameLayer = 
    sourceNode?.layoutHints?.layer !== undefined && 
    sourceNode.layoutHints.layer === targetNode?.layoutHints?.layer;

  // If they are in the same layer, minlen must be 0 to allow intra-layer routing.
  // Otherwise, minlen 1 guarantees forward progression (Left-to-Right).
  const length = isSameLayer ? 0 : 1;
  
  graph.setEdge(link.from, link.to, { minlen: length }); 
});
```

### Step 4: Execution & Path Extraction
```javascript
// 1. Run the mathematical algorithm
// This single function call triggers Dagre's 4-phase Sugiyama process:
//   a) Layering: Places nodes in exact columns.
//   b) Crossing Minimization: Reorders nodes vertically within layers to minimize edge intersections.
//   c) Node Coordinate Assignment: Applies nodesep to prevent any 3D object collision.
//   d) Edge Routing: Calculates the path around nodes, using edgesep to prevent parallel edges from overlapping.
dagre.layout(graph);

// 2. Extract Node Coordinates
const computedNodes = graph.nodes().map(id => {
  const n = graph.node(id);
  return { id, x: n.x, y: n.y, width: n.width, height: n.height };
});

// 3. Extract Orthogonal Edge Paths
// The resulting `edge.points` array contains the intersection-avoiding waypoints calculated in Step 1d.
const computedLinks = graph.edges().map(e => {
  const edge = graph.edge(e);
  // These waypoints guarantee the shortest path that avoids node boundaries 
  // and stays exactly `edgesep` (20px) away from parallel links.
  const points = edge.points;
  return { from: e.v, to: e.w, points };
});

// 5. Calculate Master Bounding Box for Dynamic Camera Framing
// We iterate through all nodes to find the maximum physical spread.
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;

computedNodes.forEach(n => {
  minX = Math.min(minX, n.x - n.width / 2);
  maxX = Math.max(maxX, n.x + n.width / 2);
  minY = Math.min(minY, n.y - n.height / 2);
  maxY = Math.max(maxY, n.y + n.height / 2);
});

// The Master Canvas Size represents the absolute true physical limits of the architecture.
const masterCanvas = { width: maxX - minX, height: maxY - minY };

// The 3D Engine DOES NOT resize the canvas DOM element. 
// Instead, it uses these dimensions to dynamically calculate the Camera's Zoom Factor 
// (or Z-Axis position) to perfectly frame the architecture with 15% visual padding.
const requiredCameraZoom = calculateCameraZoomToFit(masterCanvas.width * 1.15, masterCanvas.height * 1.15);
```

---

## 2. Dry Run Example

Let's execute this algorithm manually to demonstrate its predictability.

**Input Variables:**
*   **Nodes**: `client-01`, `lb-01`, `db-01`
*   **Settings**: `rankdir: "LR"`, `ranksep: 100`, `nodesep: 50`
*   **Dimensions**: All nodes default to `w: 100, h: 100`.

### Execution:
1.  **Phase A: Layering (Rank Assignment)**:
    *   `client-01` has no incoming links. It is assigned **Rank 0**.
    *   `lb-01` receives a link from Rank 0. It is assigned **Rank 1**.
    *   `db-01` receives a link from Rank 1. It is assigned **Rank 2**.
2.  **Phase B: Crossing Minimization**:
    *   The graph is completely linear. No reordering is required since there are zero crossing intersections.
3.  **Phase C: Node Coordinate Assignment**:
    *   *X-Axis (Horizontal Flow)*:
        *   **Rank 0 (`client-01`)**: Center X = `width / 2` = **50**.
        *   **Rank 1 (`lb-01`)**: Center X = `client X` + `(client Width / 2)` + `ranksep` + `(lb Width / 2)` = `50 + 50 + 100 + 50` = **250**.
        *   **Rank 2 (`db-01`)**: Center X = `lb X` + `(lb Width / 2)` + `ranksep` + `(db Width / 2)` = `250 + 50 + 100 + 50` = **450**.
    *   *Y-Axis (Vertical Flow)*:
        *   Since there is only one node per rank, they are all perfectly centered vertically at `height / 2` = **50**.
4.  **Phase D: Edge Routing Extraction**:
    *   The edge `client-01 -> lb-01` is analyzed. Because there are no objects in between them, the engine calculates a direct route.
    *   Waypoints extracted: `[{x: 100, y: 50}, {x: 200, y: 50}]` (from Client's right edge to LB's left edge).
5.  **Final Canvas Calculation**:
    *   `minX`: 0 (Client left edge)
    *   `maxX`: 500 (DB right edge)
    *   `minY`: 0 (Top edge of all nodes)
    *   `maxY`: 100 (Bottom edge of all nodes)
    *   **Final Bounding Box**: `{ width: 500, height: 100 }`.

### The Result:
The calculation function perfectly outputs a straight horizontal pipeline with exactly 100px of empty space between each 100x100px 3D model, mathematically bounding them within a 500x100 `masterCanvas`. 

Because we feed it the exact `layoutSettings` and `layoutSeed`, **this exact mathematical topology is guaranteed every single time the JSON is parsed.**

**Camera Application:**
When the 3D engine receives this layout, it does not stretch the models. Instead, it adds 15% padding to the `masterCanvas` (resulting in a target framing of `575x115`), calculates the `requiredCameraZoom`, and pulls the viewport camera back to perfectly fit that exact rectangular area on the user's screen.

---

## 3. Dynamic Camera Navigation (Solving Scale Disparity)

Because WebGL environments have an infinite coordinate system, the engine allows `subSystems` to grow as massively as mathematically required (e.g., a 5000x5000 VPC). The engine solves visual scale disparities entirely through **Camera Management** rather than altering node sizes:

1. **Global Framing (Initial Load)**: 
   * The camera reads `masterCanvas`, computes `requiredCameraZoom`, and pulls back to fit the entire 5000x5000 diagram. Exterior nodes (like a 100x100 Client) will visually appear as small dots.
2. **Node Focus (Drill-Down)**: 
   * When a user clicks on the small Client node, the camera executes a smooth transition.
   * Target Position: The camera moves its `(X, Y)` to the Client's computed `(X, Y)`.
   * Target Zoom: The camera sets its `zoomFactor` (or Z-Axis) to perfectly frame a 100x100 box.
3. **SubSystem Explosion**: 
   * When a user clicks the massive VPC, the camera transitions to the VPC's `(X, Y)` and zooms out to fit the 5000x5000 box, bringing the internal nodes into clear view.

This guarantees that physical node sizes remain mathematically pure, while the user experience remains perfectly legible at any level of recursion.

---

## 4. Scenario State Machine (The Two-Phase Transition)

To solve **Scenario State Leakage** (e.g., a node stays red from Scenario A when a user clicks Scenario B), the engine does not apply overrides directly to the active layout. Instead, it employs an immutable State Machine:

### Phase 0: Base State Preservation
Upon initial JSON parsing and Layout Calculation, the engine deep-clones the fully computed layout and stores it in memory as the immutable `BaseState`.

```typescript
// Store the pure mathematical result before any scenarios are applied
const baseState = structuredClone(computedLayout);
let currentState = structuredClone(baseState);
```

### Phase 1 & 2: The Transition Engine
When a user clicks "Scenario B" while viewing "Scenario A", the engine executes the following logic to guarantee no state leakage:

```typescript
async function switchScenario(targetScenarioId, scenarios) {
  // Phase 1: UI Cleanup
  // Close all active node details panels or tooltips.
  // (The main Scenario Selection sidebar/tab remains open so the user keeps context).
  await closeAllActiveOverlays();

  // Phase 2: Revert to Base State
  // Smoothly animate the active UI back to the immutable base state
  await trigger3DAnimation({
    from: currentState,
    to: baseState,
    durationMs: 400,
    easing: "easeInOutCubic"
  });
  
  // State is now clean.
  currentState = structuredClone(baseState);
  
  // If user clicked "Default Architecture", we stop here.
  const scenario = scenarios.find(s => s.id === targetScenarioId);
  if (!scenario) return; 

  // Phase 3: Compute Target State & Apply
  const targetState = structuredClone(baseState);
  
  scenario.actions.forEach(action => {
    // Locate the target node or link
    const target = targetState.nodes.find(n => n.id === action.targetId) || 
                   targetState.links.find(l => l.id === action.targetId);
                   
    if (target) {
      // Merge the scenario overrides into the target's render properties
      target.renderProps = { ...target.renderProps, ...action.props };
    }
  });
  
  // Smoothly animate the clean UI into the new Scenario's state
  await trigger3DAnimation({
    from: currentState,
    to: targetState,
    durationMs: 400,
    easing: "easeOutExpo"
  });
  // Update tracker
  currentState = targetState;
  
  // Phase 4: UI Restore
  // Now that the 3D transition is complete, we can mount the new scenario's text/details
  mountScenarioDetails(scenario);
}
```

**Why this approach?**
Not only does this mathematically prevent states from "leaking" or stacking infinitely, but the "Revert -> Apply" sequence creates a highly deliberate, cinematic visual UX, allowing users to clearly see what the scenario is changing relative to the standard architecture.

---

## 5. Chunked Rendering & Recursion Performance

Because the `subSystem` composite pattern allows for infinite nesting, rendering a global architecture (e.g., Regions -> VPCs -> Clusters -> Pods) simultaneously would exceed WebGL draw call limits and crash the browser.

The engine solves this by strictly separating **Calculation** from **Rendering**:

1. **Global Mathematical Pre-Computation**: 
   When the JSON is parsed, the Layout Engine calculates the absolute `(X, Y)` coordinates for *every* node in the entire nested hierarchy. This math is executed completely in the client memory, which is extremely fast.
2. **Layered Chunking**: 
   The 3D React component only mounts the geometry for the *active* architectural layer. A massive `subSystem` (like a VPC) is initially rendered as an opaque "Box". The 50 nodes inside it are **not** mounted to the WebGL context.
3. **The Explosion Transition**: 
   When the user clicks the VPC box, the engine executes an "Explosion Effect". 
   * The parent graph's geometries are completely unmounted from React to free up memory.
   * The camera flies into the VPC's coordinates.
   * The 50 internal nodes of the VPC are then mounted to the scene.

This Chunked Rendering approach guarantees that the browser never renders more than a single architectural layer at a time, ensuring buttery smooth 60fps performance regardless of how deep the JSON hierarchy goes.
