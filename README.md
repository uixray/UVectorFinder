# UVectorFinder

**Find and manage geometrically identical vector nodes in Figma.**

UVectorFinder analyzes SVG path geometry to detect duplicate vectors in your design files -- regardless of position, scale, name, or layer structure. Clean up redundant assets, create reusable components, and optimize your design system.

---

## How It Works

UVectorFinder uses a multi-stage geometry analysis pipeline:

```
Collect Nodes -> Extract Paths -> Parse SVG -> Normalize -> Fingerprint -> Cluster
```

1. **Collect** -- gathers all `VECTOR` and `BOOLEAN_OPERATION` nodes within your chosen scope
2. **Extract** -- reads `vectorPaths` or `fillGeometry` data from each node
3. **Parse** -- tokenizes SVG path strings (`M`, `L`, `Q`, `C`, `Z` commands) into structured data
4. **Normalize** -- shifts geometry to origin `(0,0)` and scales to unit size, making comparison position/scale-independent
5. **Fingerprint** -- generates a hash string for each normalized shape; optionally quantizes coordinates for fuzzy matching
6. **Cluster** -- groups nodes with identical fingerprints; clusters with 2+ members are reported as duplicates

This approach means **two stars at different sizes and positions** produce the **same fingerprint** and are correctly identified as duplicates.

---

## Features

### Search Modes

| Mode | Description |
|---|---|
| **Full Scan** | Finds ALL duplicate groups in the selected scope |
| **Selection Mode** | Select a vector, then find all copies of it |

### Search Scope

| Scope | Description |
|---|---|
| **Frame** | Search within the nearest parent frame |
| **Section** | Search within the nearest parent section |
| **Page** | Search within the current page |
| **File** | Search across ALL pages in the file |

### Comparison Methods

| Method | Best For |
|---|---|
| **vectorPaths** (default) | Custom curves, icons, illustrations |
| **fillGeometry** | Simple shapes (circles, rectangles) |

### Tolerance Control

| Preset | Value | Use Case |
|---|---|---|
| **Exact** | 0 | Pixel-perfect match only |
| **Pixel** | 0.5 | Ignore sub-pixel differences |
| **Relaxed** | 2.0 | Ignore minor editing artifacts |
| **Loose** | 5.0 | Find broadly similar shapes |

Custom tolerance: slider (0-10) or direct input.

### Actions on Results

- **Select All** -- select all nodes in a cluster on the canvas
- **Highlight** -- overlay colored dashed rectangles to visualize duplicate locations
- **Clear Highlights** -- remove all highlight overlays from the page
- **Zoom to Node** -- focus on any individual node with one click
- **To Component** -- convert a group of duplicates into a Component + Instances (with confirmation dialog)

### Additional

- **Persistent settings** -- scope, method, tolerance, and filters are saved between sessions
- **Progress tracking** -- real-time progress bar with cancel support
- **Cross-page navigation** -- for file-scope results, automatically switches pages when selecting nodes
- **Selection-aware** -- UI adapts when a vector is selected
- **Toast notifications** -- feedback for all action results
- **Figma theme support** -- respects Light/Dark theme via `themeColors`

---

## Quick Start

1. Install the plugin from [Figma Community](https://www.figma.com/community/plugin/uvectorfinder) (or import locally for development)
2. Run **Plugins > UVectorFinder > Settings** (or use a quick-search command)
3. Choose scope, method, and tolerance
4. Click **Search Duplicates** (or **Search Selected** if a vector is selected)
5. Browse results, click clusters to expand, use action buttons

### Menu Commands

| Command | Description |
|---|---|
| **Settings** | Open the full settings panel |
| **Search in Frame** | Quick-search within the nearest frame |
| **Search in Section** | Quick-search within the nearest section |
| **Search in Page** | Quick-search on the current page |
| **Search in File** | Quick-search across all pages |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Figma Desktop App](https://www.figma.com/downloads/)

### Setup

```bash
git clone https://github.com/uixray/UVectorFinder.git
cd UVectorFinder
npm install
```

### Build

```bash
npm run build       # Production build
npm run dev         # Watch mode (auto-rebuild on changes)
```

Output files:
- `dist/code.js` -- sandbox bundle (IIFE)
- `dist/ui.html` -- UI bundle (HTML with inlined CSS + JS)

### Test

```bash
npm test            # Run all unit tests
```

23 tests covering path parsing, normalization, and fingerprint generation.

### Load in Figma

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select `manifest.json` from this project

---

## Project Structure

```
UVectorFinder/
  manifest.json              # Figma plugin manifest
  package.json               # Dependencies & scripts
  tsconfig.json              # TypeScript configuration
  tsup.config.ts             # Build configuration (dual IIFE bundles)
  jest.config.js             # Test configuration

  src/
    code.ts                  # Sandbox entry point (message dispatcher, actions)
    types.ts                 # All TypeScript type definitions
    constants.ts             # Configuration constants & defaults

    core/
      collector.ts           # Stage 1: Collect vector nodes by scope
      extractor.ts           # Stage 2: Extract geometry (vectorPaths/fillGeometry)
      path-parser.ts         # Stage 3: Parse SVG path data strings
      normalizer.ts          # Stage 4: Normalize to position/scale-independent form
      hasher.ts              # Stage 5: Generate fingerprint hashes
      comparator.ts          # Stage 6: Orchestrator & clustering

    ui/
      ui.html                # UI markup (5 panels + modal)
      ui.ts                  # UI logic & event handling
      styles.css             # Styles (inlined during build)

    utils/
      scope-resolver.ts      # Resolve search scope from selection context
      storage.ts             # Persistent settings (figma.clientStorage)
      messaging.ts           # Sandbox -> UI message wrapper

    __tests__/
      path-parser.test.ts    # 11 tests: tokenizer, commands, edge cases
      normalizer.test.ts     # 6 tests: position/scale invariance
      hasher.test.ts         # 6 tests: exact/quantized fingerprinting

  dist/                      # Build output (not committed)
    code.js
    ui.html
```

---

## Architecture

### Sandbox (code.ts)

The sandbox runs in Figma's plugin execution environment with access to the document API. Key design decisions:

- **Synchronous message handler setup** -- `figma.ui.onmessage` is set immediately after `figma.showUI()`, before any `await` calls, to prevent message loss
- **Async node resolution** -- uses `figma.getNodeByIdAsync()` (required by `documentAccess: "dynamic-page"`)
- **Global error handling** -- all handlers wrapped in try-catch with user-visible notifications
- **Fire-and-forget with .catch()** -- async handlers called from sync dispatcher with explicit error catching

### UI (ui.ts)

The UI runs in an iframe with no direct Figma API access:

- **State machine** -- panels switch between `settings -> progress -> results/empty/error`
- **Typed messages** -- all communication uses discriminated union types
- **Dynamic rendering** -- cluster results built as DOM elements with attached event listeners
- **Toast system** -- animated notifications for action feedback

### Geometry Pipeline

The pipeline is designed for **modularity and testability**:

- Each stage is a pure function (except collector which calls Figma API)
- Stages can be unit-tested independently
- Normalization ensures `translate(100,200) scale(3)` of a shape produces the same fingerprint as the original
- Quantization enables fuzzy matching by snapping coordinates to a tolerance grid

---

## Technical Details

### Supported Node Types

- `VectorNode` -- individual vector shapes
- `BooleanOperationNode` -- union, subtract, intersect, exclude operations

### SVG Path Commands

| Command | Args | Description |
|---|---|---|
| `M` | x, y | Move to |
| `L` | x, y | Line to |
| `Q` | cx, cy, x, y | Quadratic Bezier |
| `C` | cx1, cy1, cx2, cy2, x, y | Cubic Bezier |
| `Z` | -- | Close path |

### Normalization Algorithm

```
1. Extract all (x, y) coordinates from all paths
2. Find bounds: minX, minY, maxX, maxY
3. Compute ranges: rangeX = maxX - minX, rangeY = maxY - minY
4. Scale factor = max(rangeX, rangeY)
5. For each coordinate:
   x' = (x - minX) / scaleFactor
   y' = (y - minY) / scaleFactor
```

This preserves aspect ratio while normalizing to [0, 1] range.

### Fingerprint Quantization

When tolerance > 0:

```
quantized(value) = round(value / tolerance) * tolerance
```

Two coordinates within `tolerance` distance snap to the same grid point, producing identical fingerprints.

---

## Permissions

| Permission | Reason |
|---|---|
| `documentAccess: "dynamic-page"` | Required for file-scope search across all pages |
| `networkAccess: none` | No external network requests |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Author

**UIXRay** -- [uixray.tech](https://uixray.tech)

Built with TypeScript, tsup, and the Figma Plugin API.
