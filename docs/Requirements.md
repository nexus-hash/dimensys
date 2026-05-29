# Requirements: Universal Diagram Engine

The Universal Diagram Engine is a schema-driven assembly system that constructs both 2D technical blueprints and high-fidelity 3D interactive environments from a single JSON specification.

## 1. Structural Requirements
*   **Auto-Layout Topology & Flow**: Node positioning is fully automated and algorithmic. *(See `Algorithmic_Requirements.md` for details on Layered Algorithms, Collision Avoidance, and Deterministic Seeds).*
*   **Z-Axis Extrusion**: While (X, Y) is calculated, the engine must still support a Z-depth for extrusion during the 2D -> 3D transition.
*   **Node Architecture**:
    *   Support for specialized technical types: `Server`, `Database`, `LoadBalancer`, `Client`, `Cache`, `Queue`, `Cloud`.
    *   **Internal Anatomy**: Support for "Sub-Fields" within a node (e.g., dividing a Linked List node into Value and Pointer sections).
    *   Support for basic DSA types: `ArrayNode`, `TreeNode`, `Pointer`, `StackFrame`.
*   **Logical Boundaries (Subsystems)**: Ability to define spatial boundaries (VPCs, Regions, Availability Zones) using the recursive `subSystem` pattern. These group nodes within a themed 3D bounding volume (e.g., a glass floor or glowing frame).
*   **Linkage**: Definition of directional and bidirectional connections with support for "Protocols" (Synchronous vs. Asynchronous styles).
*   **Algorithm Markers**: Support for "Floating Labels" (e.g., `i`, `j`, `low`, `high`) that attach to nodes and can move during scenarios.

## 2. Visual & Mode Requirements
*   **Blueprint Mode (2D)**:
    *   Flat rendering of all nodes and links.
    *   Technical schematic aesthetic (thin strokes, no fill).
*   **Reality Mode (3D)**:
    *   Extruded high-fidelity 3D models for all node types.
    *   Support for materials (Glass, Metal, Glow).
    *   Dynamic shadows and depth-of-field effects.
*   **Transition Engine**: Smooth interpolation for position, scale, and material properties when toggling between 2D and 3D.

## 3. Behavioral & Interactive Requirements
*   **Recursive Explosion**:
    *   Atomic nodes must reveal "Intricate Details" (internal components/logic) on click.
    *   Encapsulated nodes must expand their boundaries and reveal internal child layers on click.
*   **Simulation Layer**:
    *   Animated particle flow along links ("Traffic").
    *   Configurable traffic density, speed, and color per link.
*   **Scenario Management**: 
    *   The engine must accept a `scenarioID` and apply state deltas to the current scene.
    *   **Visibility Control**: Support for hiding/revealing links and nodes dynamically.
    *   **Style Morphing**: Ability to change a node's visual representation (e.g., from a single unit to a "Stacked" cluster) to represent scale.
    *   **Contextual Swapping**: Ability to override the "Explosion" content (Details) per scenario to show context-specific information (e.g., Error Logs vs. Success Metrics).
    *   **In-Place Transitions**: All changes must occur via smooth 3D transitions/interpolations rather than full scene re-renders.

## 4. Data & Content Requirements
*   **Contextual Overlays**: Ability to attach textual explanations, code snippets, or performance metrics to any node or link.
*   **Metadata Integration**: Association of functional/non-functional requirements with specific architectural components.

## 5. Performance & Technical Requirements
*   **Schema Validation**: The engine must validate incoming JSON against the `DiagramRenderedSpec`.
*   **Responsiveness & Dynamic Framing**: The coordinate system must be relative. The engine must use a `fitToBox()` transition to frame the scene. *(See `Algorithmic_Requirements.md` for mathematical bounding volume calculation rules).*
*   **Asset Library**: A modular library of procedural 3D models that can be added to/updated independently of the core engine logic.
