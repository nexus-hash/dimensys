# Visual Building Blocks Specification

This document defines the visual design language for the Universal Diagram Engine, bridging the gap between the 2D Blueprint (schematic view) and the 3D Diagram (immersive view). The designs are rooted in a premium, glassmorphic, dynamic aesthetic with deep support for light/dark mode transitions.

## 1. Core Theming & Aesthetic Principles
*   **2D Blueprint**: Focuses on clarity, precision, and schematic wireframing. Uses crisp SVG rendering, subtle gradients, and semantic colors. It serves as the "Architect's Drafting Board".
*   **3D Diagram**: Focuses on immersion, spatial relationships, and physical presence. Uses React Three Fiber, metallic/matte physical-based rendering (PBR) materials, frosted glass for containers, and emissive glowing textures for data/status.
*   **Colors**: 
    *   *Compute/Servers*: Deep Blues / Cyans
    *   *Databases/Storage*: Emerald Greens
    *   *Queues/Caches*: Neon Purples / Magentas
    *   *Load Balancers*: Warm Oranges
    *   *Clients*: Neutral Grays / Whites

---

## 2. Structural Nodes (HLD)

### Server / Compute (`server`, `worker`, `orchestrator`)
*   **2D Blueprint**: Sharp rectangle with a subtle top-to-bottom linear gradient. A central "server rack" or "gear" SVG icon. Border becomes a solid neon color when active/selected.
*   **3D Diagram**: A tall rectangular prism (monolith). Dark metallic chassis. The front face features emissive "status LEDs" that pulse rhythmically. 

### Database (`db`, `objectStore`)
*   **2D Blueprint**: Classic stacked-disk cylinder wireframe.
*   **3D Diagram**: Three stacked cylindrical disks hovering slightly apart. The gaps between the disks emit a strong green glow, representing data integrity.

### Cache (`cache`)
*   **2D Blueprint**: Rounded rectangle (pill shape) with a lightning bolt icon, emphasizing speed.
*   **3D Diagram**: A low-profile, sleek, wedge-like box. Uses an extremely bright, emissive neon purple material to signify high-speed RAM.

### Load Balancer / API Gateway (`lb`, `apiGateway`)
*   **2D Blueprint**: A diamond or hexagon shape, indicating a decision/routing point. 
*   **3D Diagram**: A central hexagonal hub. It features glowing tracks radiating outward from the center to represent traffic distribution.

### Messaging & Queues (`messageBus`, `queue`)
*   **2D Blueprint**: A wide rectangle with horizontal dashed lines or a "conveyor belt" icon.
*   **3D Diagram**: A segmented, translucent tunnel or open pipe. Inside, glowing spheres (messages) wait in a line.

### Clients (`client`)
*   **2D Blueprint**: Minimalist rounded rectangles featuring a mobile phone or laptop icon.
*   **3D Diagram**: Floating, ultra-thin frosted glass panes. Very lightweight appearance compared to backend infrastructure.

---

## 3. Data Structures (LLD / DSA)

### Algorithmic Node (`node`)
*   **2D Blueprint**: A perfect circle with bold typography in the center (representing the value). 
*   **3D Diagram**: A perfect floating sphere. When a pointer (like `root` or `curr`) targets it, an emissive halo ring orbits the sphere.

### Pointers (`markers`)
*   **2D Blueprint**: A sleek, colored badge (e.g., `[ i ]`) floating above or below a DSA node.
*   **3D Diagram**: A 3D floating chevron or floating text geometry that smoothly tweens from one node to another during algorithm steps.

---

## 4. SubSystems & Containers

### Boundaries (`subSystem`, `vpc`, `region`, `cluster`)
*   **2D Blueprint**: A dashed bounding box. The background has a 5% opacity fill. A solid-colored tab sits on the top-left corner displaying the label (e.g., "AWS us-east-1").
*   **3D Diagram**: Instead of a full box, it renders as a **frosted glass floor/pedestal**. The nodes sit on top of it. A subtle glowing boundary line traces the perimeter. When the "Explosion" effect triggers, the floor expands and lowers.

---

## 5. Edges, Links & Traffic

### Protocol Types
*   **`sync` (Synchronous HTTP/RPC)**:
    *   *2D*: Solid, thick 2px stroke line with sharp 90-degree orthogonal corners and an arrowhead.
    *   *3D*: A solid, metallic "fiber-optic" cable laid out on the 3D grid.
*   **`async` (Asynchronous / Events)**:
    *   *2D*: Dashed stroke line.
    *   *3D*: A pulsing, translucent beam of light that occasionally blinks.
*   **`stream` (WebSockets / TCP Streams)**:
    *   *2D*: A glowing line with a CSS animated dash-offset to look like water flowing.
    *   *3D*: A hollow glass tube. 

### Traffic Animation (The Data Layer)
Regardless of the connection type, `traffic` dictates the animation speed and density.
*   **2D Blueprint**: Animated SVG dots (particles) that travel along the `<path>` stroke using `stroke-dasharray` animations.
*   **3D Diagram**: Instanced Mesh glowing orbs that travel along a CatmullRomCurve3 derived from the layout points. If bidirectional (`traffic: { forward, backward }`), two distinct streams of orbs travel on slightly offset parallel tracks inside the cable.

---

## 6. HUD & Interactive Elements

### Details/Explosion Overlay
When a user clicks a node or triggers a scenario, the HTML-based HUD takes over.
*   **Design**: Glassmorphic UI panels (Tailwind `backdrop-blur-md bg-white/10 dark:bg-black/40`) that slide in from the right side. 
*   **Typography**: Inter/Roboto for labels, Monospace (Fira Code) for technical logs and `code` sections.
*   **Transitions**: Framer Motion is used to handle all 2D HTML entering/exiting, ensuring it syncs perfectly with the React Three Fiber 3D camera zoom.
