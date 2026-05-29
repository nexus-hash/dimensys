# Specification: Diagram Rendered JSON (DRJ)

This document defines the schema used by the Universal Diagram Engine to assemble 2D blueprints and 3D interactive scenes.

## Example JSON
<details>
<summary>Click to expand Example JSON</summary>

```json
{
  "id": "scalable-web-app-01",
  "type": "hld",
  "metadata": {
    "title": "Scalable Web Architecture",
    "description": "A high-level design for a global web application featuring load balancing, caching, and database replication.",
    "requirements": [
      { "type": "functional", "text": "Support 1M concurrent users" },
      { "type": "non-functional", "text": "Sub-100ms latency" }
    ]
  },
  "layout": {
    "nodes": [
      {
        "id": "client-01",
        "type": "client",
        "label": "Web Browser",
        "layoutHints": { "rank": "top" }
      },
      {
        "id": "lb-01",
        "type": "lb",
        "label": "Global LB",
        "layoutHints": { "rank": "mid", "layer": 1 },
        "details": {
          "title": "Load Balancer Configuration",
          "sections": [
            {
              "title": "Algorithm",
              "type": "kv",
              "data": [
                { "key": "Type", "value": "L7 Layer", "hint": "Application Level" },
                { "key": "Algo", "value": "Least Connections" }
              ]
            },
            {
              "title": "Rationale",
              "type": "text",
              "data": "Chosen to prevent traffic hotspots on servers with long-lived WebSocket connections."
            }
          ]
        }
      },
      {
        "id": "server-cluster-01",
        "type": "subSystem",
        "subType": "vpc",
        "label": "App Servers (Private VPC)",
        "role": "active",
        "layoutHints": { "layer": 2 },
        "layout": {
          "nodes": [
            { "id": "s1", "type": "server", "label": "API Node 1" },
            { "id": "s2", "type": "server", "label": "API Node 2" }
          ],
          "links": []
        }
      },
      {
        "id": "db-01",
        "type": "db",
        "label": "Primary DB",
        "role": "primary",
        "layoutHints": { "layer": 3 },
        "subFields": [
          { "key": "storage", "value": "SSD" },
          { "key": "engine", "value": "InnoDB" }
        ],
        "details": {
          "title": "Database Internals",
          "sections": [
            {
              "title": "Replication",
              "type": "kv",
              "data": [{ "key": "Mode", "value": "Semi-Synchronous" }]
            },
            {
              "title": "Endpoints",
              "type": "table",
              "data": {
                "columns": [
                  { "key": "type", "label": "Type" },
                  { "key": "host", "label": "Host" }
                ],
                "rows": [
                  { "type": "Read/Write", "host": "db-primary.vpc.internal" }
                ]
              }
            }
          ]
        }
      }
    ],
    "links": [
      { "id": "l1", "from": "client-01", "to": "lb-01", "protocol": "sync", "trafficRate": 80 },
      { "id": "l2", "from": "lb-01", "to": "server-cluster-01", "protocol": "sync" },
      { "id": "l4", "from": "server-cluster-01", "to": "db-01", "protocol": "sync" }
    ]
  },
  "scenarios": [
    {
      "id": "traffic-surge",
      "name": "Peak Traffic Surge",
      "actions": [
        { "targetId": "l1", "props": { "trafficRate": 100, "color": "#ff6600" } },
        { "targetId": "server-cluster-01", "props": { "style": "stacked" } }
      ]
    },
    {
      "id": "db-failure",
      "name": "Primary DB Failure",
      "actions": [
        { "targetId": "l4", "props": { "visible": false } },
        { 
          "targetId": "db-01", 
          "props": { 
            "color": "#ff0000",
            "details": {
              "title": "CRITICAL: Database Offline",
              "sections": [
                {
                  "title": "Error Log",
                  "type": "code",
                  "data": { "language": "text", "snippet": "FATAL: connection limit exceeded for non-superusers\n[ERROR] Heartbeat timeout after 5000ms" }
                }
              ]
            }
          } 
        }
      ]
    }
  ]
}
```
</details>

## Root Schema
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | **Mandatory** | Unique identifier for the solution (e.g., `load-balancer-01`). |
| `type` | `Enum` | **Mandatory** | Category: `hld` (System Design) or `dsa` (Algorithms). |
| `metadata` | `Object` | **Mandatory** | Meta-information about the problem. |
| `layout` | `Object` | **Mandatory** | Structural definition of the diagram. |
| `markers` | `Array<Marker>` | Optional | Algorithm pointers (i, j, root). |
| `scenarios` | `Array` | Optional | List of interactive scenarios/states. |

---

## Metadata Object
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | **Mandatory** | Human-readable title. |
| `description` | `String` | **Mandatory** | High-level summary of the solution. |
| `requirements` | `Array<Req>` | Optional | List of functional/non-functional requirements. |

---

## Layout Object
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `nodes` | `Array<Node>` | **Mandatory** | List of all components in the scene. |
| `links` | `Array<Link>` | **Mandatory** | List of all connections between nodes. |

---

## Layout Object
### Nodes Array (`layout.nodes`)
Defines the individual components in the system.
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | **Mandatory** | Unique ID for the node. |
| `type` | `Enum` | **Mandatory** | Tech type: `server`, `db`, `lb`, `client`, `cache`, `queue`, `cloud`, `apiGateway`, `objectStore`, `messageBus`, `worker`, `orchestrator`, `subSystem`, `node` (DSA). |
| `subType` | `Enum` | Optional | **For subSystems**: `region`, `vpc`, `cluster`, `group`. Determines boundary style. |
| `role` | `Enum` | Optional | Role: `primary`, `replica`, `leader`, `follower`, `active`. |
| `label` | `String` | Optional | Visible label above the node. |
| `layout` | `Object` | Optional | **Mandatory if type is subSystem**: Internal architecture `{ nodes, links }`. |
| `layoutHints` | `Object` | Optional | Hints for the auto-layout engine (see Layout Hints table). |
| `subFields` | `Array<Field>`| Optional | For DSA: `[{ key: "val", value: 10 }, { key: "next", value: "ptr" }]`. |
| `details` | `Object` | Optional | Data for the "Exploded View" (see Details Object table). |

> [!NOTE]
> **Recursive Nesting via `subSystem`**: When a node's `type` is set to `subSystem`, it acts as a container for a nested architecture. The `layout` object inside such a node must follow the same schema as the root `layout`, allowing for infinite architectural depth. This triggers the **Expansion UX** where the node grows to reveal its internal components.

---

## Layout Hints Object
Used by the auto-layout engine to determine spatial organization without manual coordinates.
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `rank` | `Enum` | Optional | `top`, `bottom`, `left`, `right`, `center`. Suggests a primary region. |
| `layer` | `Number` | Optional | Tier/depth level (e.g., `0` for User, `1` for LB, `2` for App). |
| `group` | `String` | Optional | ID of a logical cluster. Nodes in the same group are pulled together. |
| `weight` | `Number` | Optional | Importance (1-100). Higher weights gravitate toward the center. |
| `align` | `Enum` | Optional | `start`, `end`, `center`. Alignment within a specific rank or group. |

---

---

## Details Object
Defines the content revealed during the "Explosion" interaction. Uses a modular sectional architecture to support varied technical metadata.
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | Optional | Main heading for the explosion overlay. |
| `sections` | `Array<Section>`| **Mandatory** | List of modular content blocks. |

### Section Object
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | **Mandatory** | Title of the block (e.g., "Endpoints"). |
| `type` | `Enum` | **Mandatory** | `text`, `kv`, `table`, `list`, `code`. |
| `data` | `Any` | **Mandatory** | The content matching the structures defined below. |

---

## Data Structures by Section Type

### 1. `text`
*   **Data**: `String`
*   **Description**: Markdown-formatted string for descriptive text or rationales.

### 2. `kv` (Key-Value)
*   **Data**: `Array<Object>`
*   **Schema**: `[{ key: String, value: String|Number, hint?: String }]`
*   **Use Case**: Displaying properties like `Algorithm: Round Robin` or `Memory: 16GB`.

### 3. `table`
*   **Data**: `Object`
*   **Schema**:
    ```json
    {
      "columns": [{ "key": String, "label": String }],
      "rows": [{ "colKey1": "val1", "colKey2": "val2" }]
    }
    ```
*   **Use Case**: Structured data like API Endpoints or Shard Maps.

### 4. `list`
*   **Data**: `Array<Object>`
*   **Schema**: `[{ text: String, type?: "info"|"warning"|"success" }]`
*   **Use Case**: Feature lists, event subscriptions, or constraint lists.

### 5. `code`
*   **Data**: `Object`
*   **Schema**: `{ language: String, snippet: String, title?: String }`
*   **Use Case**: Providing request/response payloads or implementation snippets.

---

### Links Array (`layout.links`)
Defines the connections between nodes.
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | **Mandatory** | Unique ID for the link. |
| `from` | `String` | **Mandatory** | ID of the source node. |
| `to` | `String` | **Mandatory** | ID of the target node. |
| `type` | `Enum` | Optional | `uni` (Unidirectional) or `bi` (Bidirectional). |
| `protocol` | `Enum` | Optional | `sync` (Solid line), `async` (Dashed line), `stream` (Flowing). |
| `trafficRate` | `Number` | Optional | Density of particles (0 to 100). |

---

## Markers Array
Algorithm pointers for DSA.
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | **Mandatory** | Unique ID for the marker. |
| `label` | `String` | **Mandatory** | The pointer name (e.g., `i`, `j`, `slow`, `fast`). |
| `targetNodeId`| `String` | **Mandatory** | The node ID the marker is currently pointing to. |
| `color` | `String` | Optional | Hex color for the marker label/arrow. |

---

## Scenarios Array
Defines changes to the base state for specific use cases.
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | **Mandatory** | ID of the scenario. |
| `name` | `String` | **Mandatory** | Name shown in the Scenario Navigator. |
| `actions` | `Array<Action>` | **Mandatory** | List of property changes to apply. |

### Action Object
| Key | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `targetId` | `String` | **Mandatory** | ID of the Node or Link to modify. |
| `props` | `Object` | **Mandatory** | Map of property changes: `{ opacity, color, trafficRate, visible, style, details }`. |

> [!TIP]
> **Dynamic Details**: By including a `details` object in a scenario action, you can change the information revealed in the "Explosion" view specifically for that scenario (e.g., showing an error log instead of a standard metrics table).

