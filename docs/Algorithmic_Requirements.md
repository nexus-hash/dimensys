# Algorithmic Requirements

This document defines the mathematical and algorithmic rules used by the Universal Diagram Engine to translate the JSON schema into a stable, non-overlapping 3D environment.

## 1. Auto-Layout Engine (Dagre / Sugiyama)
* **Framework**: The engine must use a **Layered Graph Algorithm** (specifically the Sugiyama framework, e.g., the `dagre` library) rather than physics-based force-directed graphs.
* **Semantic Ordering**: The layout engine must respect the `layoutHints.layer` property to enforce strict directional flow (e.g., Clients strictly on the left, Databases strictly on the right).
* **Collision Avoidance**: By allocating nodes into strict grid cells/ranks, the algorithm mathematically guarantees zero overlap between 3D objects, eliminating the need for collision physics.

## 2. Deterministic Rendering
* **Seed Value**: The root JSON schema accepts an optional `layoutSeed` (salt). If omitted, the engine uses a consistent global default salt (e.g., `"dimensys-global-salt"`).
* **PRNG Integration**: Any randomness required by the layout engine (e.g., tie-breaking during edge routing) must use a Pseudo-Random Number Generator initialized with the salt. This guarantees that the same JSON always produces the exact same `(x, y)` topology without requiring the user to manually define a seed every time.

## 3. Required Algorithmic Parameters (JSON Spec Addition)
To ensure the calculation function produces the exact same `(x, y)` coordinates and edge paths in every single iteration, the JSON spec must provide specific mathematical constraints to the Dagre engine. 

We must introduce a **`layoutSettings`** object to the root schema, containing the following strict parameters:

| Parameter | Type | Description | Effect on Determinism |
| :--- | :--- | :--- | :--- |
| `ranksep` | `Number` | Distance between layers (e.g., 100px). | Guarantees exact horizontal spacing between a Client and a Load Balancer. |
| `nodesep` | `Number` | Distance between nodes in the same layer. | Guarantees exact vertical spacing between two sibling API servers. |
| `edgesep` | `Number` | Distance between parallel links. | Prevents links from merging into a single indistinguishable line. |

## 4. Engine-Level Constants (Not in JSON)
To keep the JSON schema clean, the mathematical dimensions of the nodes are **NOT** provided in the JSON. Instead, they are defined as an Engine-Level Constant map linked directly to the `type` enum. 

When the 3D models are created, their exact `(width, height)` bounding boxes are registered in an internal map (e.g., `ENGINE_CONSTANTS.dimensions`). The calculation function queries this map using the node's `type` (e.g., `server`, `lb`, `db`) to determine the exact size needed for collision avoidance. 

*Note: Individual nodes can still override their size via an optional `layoutHints.width` and `layoutHints.height` if they deviate from the default model size.*

## 4. Dynamic Camera Framing
* **Bounding Volume Calculation**: After the 2D `(x, y)` coordinates are resolved, the engine must compute the Master Bounding Box (Width, Height, Depth) of the entire layout.
* **Viewport Fitting**: The 3D Camera must dynamically transition using a `fitToBox()` algorithm to perfectly frame the architecture, ensuring that whether the JSON describes 2 nodes or 2,000 nodes, it always fits precisely within the user's viewport without manual zoom adjustments.
