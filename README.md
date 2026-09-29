# 🌌 Dimensys

**Step inside real systems: live, breakable system design diagrams.**

Dimensys is an open-source Next.js application for learning system design by doing. Each diagram is a real architecture running live in your browser: watch requests flow, break a component, apply a fix and watch it recover.

---

## ✨ Features

- **Interactive System Diagrams**: A static, server-rendered SVG blueprint of the architecture, paired with an in-browser simulation you can play, pause and scrub.
- **Break It Scenarios**: Kill a node, flood a queue, flip a switch — watch cascading failure and recovery play out in real time.
- **Dark/Light Mode**: Full theme support optimized for both reading clarity and visual impact.
- **Static-First**: Diagram layouts are pre-compiled at build time and ship as plain HTML/SVG — no layout algorithm runs in the browser. Only the simulation itself runs client-side.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: Custom components on [Radix UI](https://www.radix-ui.com/) primitives

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24+

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/dimensys.git
   cd dimensys
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev:next
   ```
   
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

*(Note: If you have access to the private `dms-engine` repository, you can run `npm run dev` to start both the Next.js server and the live-reloading engine compiler concurrently).*

---

## 🤝 Contributing

We welcome contributions from the community! 

### Code Contributions
You can freely edit the application shell, dashboard, UI components, and static pages. Submit a Pull Request with your improvements.

### Requesting New Diagrams
Diagram content is produced by our proprietary engine (`dms-engine`), so it can't be edited in this repository.

To request a new system design diagram or a modification to an existing one:
1. Go to the **Issues** tab.
2. Click **New Issue** and select the **📐 Diagram Request** template.
3. Fill out the structured form with the system's components, connections, and scenarios.
4. Our maintainers will process the request through `dms-engine` and the compiled diagram will be deployed automatically!

---

## 🏗️ How it Works under the Hood

Diagrams and simulations are produced by the proprietary `dms-engine`, which is not part of this repository. At build time its compiled output is synced into the app, and this repository renders it: the pages, the diagram canvas, the controls and the rest of the interface.

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0) — see the [LICENSE](./LICENSE) file for details.

For licensing exceptions and information about generated content, see [LICENSE-EXCEPTIONS.md](./LICENSE-EXCEPTIONS.md).

*(Note: The diagram generation engine, `dms-engine`, is proprietary and not included in this repository).*
