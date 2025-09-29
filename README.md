# Xeokit_Learning

A **React + TypeScript + Vite** learning/experimental project, built to practice loading and interacting with **IFC** and **XKT** models in the browser, and to demonstrate common features of **xeokit-sdk** (Viewer, NavCube, SectionPlanes, TreeView, etc.).

> Goals:
>
> - Quickly set up an interactive BIM viewer locally.
> - Compare **IFC (parsed via web-ifc)** and **XKT (pre-converted)** loading workflows and performance.
> - Collect common troubleshooting notes (WASM paths, Netlify deployment, resolution sync, etc.).

---

## ✨ Features

- React 19 + Vite 7 + TypeScript 5
- Tailwind CSS v4 + DaisyUI (UI examples)
- `@xeokit/xeokit-sdk` 2.x
- Load **IFC**: `WebIFCLoaderPlugin` (using `web-ifc` WASM)
- Load **XKT**: `XKTLoaderPlugin`
- Navigation cube (`NavCubePlugin`)
- Section planes & section cap coloring (`SectionPlanesPlugin` / cap material)
- TreeView (by storeys/types) with simple context menu example
- DPR / resolution sync, ResizeObserver, custom grid helpers

---

## 📂 Project Structure

```
.
├─ public/
│  ├─ models/
│  │  ├─ ifc/   # IFC test files
│  │  └─ xkt/   # XKT examples (v8)
│  ├─ web-ifc-mt.worker.js
│  └─ vite.svg / cat.svg / screenshots ...
├─ src/
│  ├─ components/          # Navbar, controls
│  ├─ examples/            # Demo components (IFC/XKT loading, TreeView...)
│  ├─ utils/xeokit/        # Camera, pivot, NavCube, grid, etc.
│  ├─ types/xeokit.d.ts
│  ├─ data.ts              # Page + model registry
│  ├─ App.tsx / main.tsx
│  └─ index.css            # Tailwind v4
├─ index.html
├─ package.json
└─ vite.config.ts
```

---

## 🚀 Getting Started

### 1) Requirements

- Node.js ≥ 20 (latest LTS recommended)
- Any package manager (npm / pnpm / yarn)

### 2) Install & Run

```bash
# Install dependencies
npm i

# Development mode
npm run dev

# Build static files
npm run build

# Preview (requires build first)
npm run preview
```

Then open the URL shown in the terminal (usually [http://127.0.0.1:5173](http://127.0.0.1:5173)).

---

## 🧭 Interface & Controls

- **Navbar (top):**

  - Select demo page (IFC / XKT)
  - Choose model file
  - Toggle model format (IFC ↔ XKT)

- **NavCube (bottom-right):** Click faces/edges/corners to change view.
- **Section Planes:** Enabled in certain pages; supports clipping + cap materials.

---

## 🧩 Demo Pages (`src/examples/`)

> Registered in `src/data.ts` under `pages` and selectable in the UI.

- **LoadIFC / LoadIFC2 / LoadIFC-Practice**: IFC workflow, WASM check, NavCube, grid.
- **LoadXKT / LoadXKT2 / XktModelViewer**: Load XKT with camera/section/grid setup.
- **TypeTreeIFC / TypeTreeIFC2**: TreeView by IFC type.
- **TreeViewStoreys**: TreeView by storeys.
- **IFCPick / IFCSelect**: Mouse picking & highlighting.
- **ContextMenuTreeView**: Right-click context menu + TreeView UI demo.

> Default startup page and model can be changed in `App.tsx`:

```ts
const [compId, setCompId] = useState<number>(6); // Page index
const [modelId, setModelId] = useState<number>(3); // Model index
const [modelFormat, setModelFormat] = useState<'ifc' | 'xkt'>('xkt');
```

---

## 🗂️ Adding Models (IFC / XKT)

- Place IFC files in `public/models/ifc/` and XKT files in `public/models/xkt/`.
- Add entry to `ifcModels` in `src/data.ts`:

```ts
{
  label: 'My_IFC',
  path: '/models/ifc/my_model.ifc',
  format: 'ifc',
}
// or XKT
{
  label: 'My_XKT',
  path: '/models/xkt/my_model.xkt',
  format: 'xkt',
}
```

- If the page/model format mismatch, the app falls back to Duplex.ifc (see `App.tsx`).

---

## 🧱 IFC Parsing (web-ifc) Notes

- **WASM path** must be directly accessible, otherwise SPA routing may serve `index.html` instead and break loading.
- Example approach:

  1. Use `import.meta.env.BASE_URL` to build base path (supports subpath deployment).
  2. Use `HEAD` request to verify `web-ifc.wasm` is reachable.
  3. Fallback to CDN (`https://unpkg.com/web-ifc@x.y.z/`) if not.
  4. Initialize:

```ts
const IfcAPI = new WebIFC.IfcAPI();
IfcAPI.SetWasmPath(wasmBase);
await IfcAPI.Init();
const ifcLoader = new WebIFCLoaderPlugin(viewer, { WebIFC, IfcAPI });
```

> See `examples/LoadIFC.tsx`.

---

## 📦 Dependencies (key versions)

- `@xeokit/xeokit-sdk`: ^2.6.90
- `web-ifc`: ^0.0.71
- `react`: ^19.1.1
- `vite`: ^7.1.6
- `tailwindcss`: ^4.1.13
- `daisyui`: ^5.1.14

See `package.json` for full list.

---

## 🛫 Deployment Notes (Netlify / Vercel)

- If deploying under subpath (`https://your.site/app/`):

  - Set `base: '/app/'` in `vite.config.ts` or use `import.meta.env.BASE_URL`.
  - Ensure `web-ifc.wasm` and worker files are not returning 404 or HTML.

- Place static assets (IFC/XKT) in `public/models/...`.

---

## 🗺️ Roadmap

- ✅ Basic IFC/XKT loading & interaction
- ⬜ XKT conversion workflow notes (CLI, cloud queues)
- ⬜ Full-featured TreeView (checkboxes, parent-child sync)
- ⬜ Section cap material best practices
- ⬜ Large-model performance comparison (IFC vs XKT)

---

## 📚 References

- xeokit SDK docs & examples
- web-ifc project & WASM documentation

---

## 📝 License

This repo is for learning/research purposes. For commercial use or redistribution, comply with licenses of included dependencies.
