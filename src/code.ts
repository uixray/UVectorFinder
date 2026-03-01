import { UIToSandboxMessage, SearchScope, SearchConfig, ContainerInfo } from './types';
import { UI_WIDTH, UI_HEIGHT } from './constants';
import { loadSettings, saveSettings } from './utils/storage';
import { sendToUI } from './utils/messaging';
import { runSearch, cancelSearch, clearGeometryCache } from './core/comparator';

// ══════════════════════════════════════════════════════════════════════
// 1. Show UI FIRST, set message handler SYNCHRONOUSLY — no awaits!
// ══════════════════════════════════════════════════════════════════════

figma.showUI(__html__, { width: UI_WIDTH, height: UI_HEIGHT, themeColors: true });

// Critical: set IMMEDIATELY after showUI, before ANY await
figma.ui.onmessage = (msg: UIToSandboxMessage) => {
  handleMessage(msg);
};

figma.on('selectionchange', () => {
  try {
    const sel = figma.currentPage.selection;
    const vec = sel.find(n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION');
    const container = detectContainerSelection(sel);
    sendToUI({
      type: 'selection-changed',
      hasSelection: !!vec,
      selectionName: vec?.name,
      containerSelection: container,
    });
  } catch (_) {
    // Ignore selection change errors
  }
});

// ══════════════════════════════════════════════════════════════════════
// 2. Async init — loads settings, sends to UI, handles menu commands
// ══════════════════════════════════════════════════════════════════════

async function init() {
  try {
    const settings = await loadSettings();
    const command = figma.command;

    const selection = figma.currentPage.selection;
    const vectorSelection = selection.find(
      n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION'
    );
    const containerSelection = detectContainerSelection(selection);

    const scopeMap: Record<string, SearchScope> = {
      'search-frame': 'frame',
      'search-section': 'section',
      'search-page': 'page',
      'search-file': 'file',
    };
    const commandScope = scopeMap[command] || null;

    sendToUI({
      type: 'settings-loaded',
      settings: commandScope ? { ...settings, scope: commandScope } : settings,
      hasSelection: !!vectorSelection,
      selectionName: vectorSelection?.name,
      containerSelection,
    });

    if (commandScope) {
      const config: SearchConfig = {
        mode: vectorSelection ? 'selection' : 'fullScan',
        scope: commandScope,
        method: settings.method,
        tolerance: settings.tolerance,
        filters: settings.filters,
      };
      executeSearch(config);
    }
  } catch (err) {
    figma.notify(`Init error: ${String(err)}`, { error: true });
  }
}

init();

// ══════════════════════════════════════════════════════════════════════
// 3. Message dispatcher — GLOBAL try-catch, all handlers are async
// ══════════════════════════════════════════════════════════════════════

function handleMessage(msg: UIToSandboxMessage): void {
  try {
    switch (msg.type) {
      case 'start-search':
        executeSearch(msg.config).catch(wrapAsync('Search'));
        break;

      case 'cancel-search':
        cancelSearch();
        break;

      case 'load-settings':
        handleLoadSettings().catch(wrapAsync('Load settings'));
        break;

      case 'save-settings':
        saveSettings(msg.settings);
        break;

      // All action handlers are now ASYNC (because getNodeByIdAsync)
      case 'select-nodes':
        handleSelectNodes(msg.nodeIds).catch(wrapAsync('Select'));
        break;

      case 'zoom-to-node':
        handleZoomToNode(msg.nodeId).catch(wrapAsync('Zoom'));
        break;

      case 'highlight-cluster':
        handleHighlightCluster(msg.nodeIds, msg.clusterIndex).catch(wrapAsync('Highlight'));
        break;

      case 'clear-highlights':
        handleClearHighlights();
        break;

      case 'componentize-cluster':
        handleComponentize(msg.nodeIds).catch(wrapAsync('Componentize'));
        break;

      default:
        console.warn('UVF: Unknown message type', (msg as any).type);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    figma.notify(`Plugin error: ${errorMsg}`, { error: true });
    console.error('UVF handleMessage error:', err);
  }
}

/** Wraps unhandled async rejections into figma.notify */
function wrapAsync(label: string) {
  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    figma.notify(`${label} failed: ${msg}`, { error: true });
    console.error(`UVF ${label} error:`, err);
  };
}

// ══════════════════════════════════════════════════════════════════════
// 4. Helpers — ASYNC node resolution (documentAccess: dynamic-page
//    requires getNodeByIdAsync instead of getNodeById)
// ══════════════════════════════════════════════════════════════════════

/** Walk up parent chain to find the PageNode this node belongs to */
function getNodePage(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current) {
    if (current.type === 'PAGE') return current as PageNode;
    current = current.parent;
  }
  return null;
}

/** Switch to a different page if the node is not on the current page */
function ensureCorrectPage(page: PageNode | null): void {
  if (page && page.id !== figma.currentPage.id) {
    figma.currentPage = page;
  }
}

/**
 * Resolve an array of node IDs into SceneNodes using ASYNC API.
 * documentAccess: "dynamic-page" forbids synchronous figma.getNodeById().
 */
async function resolveNodes(nodeIds: string[]): Promise<{ nodes: SceneNode[]; page: PageNode | null }> {
  const nodes: SceneNode[] = [];
  let page: PageNode | null = null;

  for (const id of nodeIds) {
    try {
      const node = await figma.getNodeByIdAsync(id);
      if (!node) continue;

      // Only SceneNodes can be selected / manipulated
      if (node.type === 'DOCUMENT' || node.type === 'PAGE') continue;

      const sceneNode = node as SceneNode;
      nodes.push(sceneNode);

      if (!page) {
        page = getNodePage(sceneNode);
      }
    } catch (_) {
      // Node may have been deleted or is inaccessible
      continue;
    }
  }

  return { nodes, page };
}

// ══════════════════════════════════════════════════════════════════════
// 5. Action handlers — ALL async (due to getNodeByIdAsync)
// ══════════════════════════════════════════════════════════════════════

async function executeSearch(config: SearchConfig): Promise<void> {
  try {
    const result = await runSearch(config, progress => {
      sendToUI({ type: 'search-progress', progress });
    });
    sendToUI({ type: 'search-complete', result });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    sendToUI({ type: 'search-error', error: errorMsg });
    figma.notify(`Search error: ${errorMsg}`, { error: true });
  }
}

async function handleLoadSettings(): Promise<void> {
  const s = await loadSettings();
  const sel = figma.currentPage.selection;
  const vec = sel.find(n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION');
  const container = detectContainerSelection(sel);
  sendToUI({
    type: 'settings-loaded',
    settings: s,
    hasSelection: !!vec,
    selectionName: vec?.name,
    containerSelection: container,
  });
}

async function handleSelectNodes(nodeIds: string[]): Promise<void> {
  try {
    if (!nodeIds || nodeIds.length === 0) {
      figma.notify('No node IDs provided', { error: true });
      sendToUI({ type: 'action-complete', action: 'select', success: false });
      return;
    }

    const { nodes, page } = await resolveNodes(nodeIds);

    if (nodes.length === 0) {
      figma.notify('Nodes not found (may have been deleted)', { error: true });
      sendToUI({ type: 'action-complete', action: 'select', success: false });
      return;
    }

    // Switch page if needed (e.g. file-scope search results)
    ensureCorrectPage(page);

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
    figma.notify(`Selected ${nodes.length} node${nodes.length > 1 ? 's' : ''}`);
    sendToUI({ type: 'action-complete', action: 'select', success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    figma.notify(`Select failed: ${errorMsg}`, { error: true });
    console.error('UVF handleSelectNodes:', err);
    sendToUI({ type: 'action-complete', action: 'select', success: false, message: errorMsg });
  }
}

async function handleZoomToNode(nodeId: string): Promise<void> {
  try {
    if (!nodeId) {
      figma.notify('No node ID provided', { error: true });
      sendToUI({ type: 'action-complete', action: 'zoom', success: false });
      return;
    }

    const node = await figma.getNodeByIdAsync(nodeId);

    if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
      figma.notify('Node not found', { error: true });
      sendToUI({ type: 'action-complete', action: 'zoom', success: false });
      return;
    }

    const sceneNode = node as SceneNode;

    // Switch to the node's page if on a different page
    const page = getNodePage(sceneNode);
    ensureCorrectPage(page);

    figma.currentPage.selection = [sceneNode];
    figma.viewport.scrollAndZoomIntoView([sceneNode]);
    sendToUI({ type: 'action-complete', action: 'zoom', success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    figma.notify(`Zoom failed: ${errorMsg}`, { error: true });
    console.error('UVF handleZoomToNode:', err);
    sendToUI({ type: 'action-complete', action: 'zoom', success: false, message: errorMsg });
  }
}

async function handleHighlightCluster(nodeIds: string[], clusterIndex: number): Promise<void> {
  try {
    if (!nodeIds || nodeIds.length === 0) {
      figma.notify('No nodes to highlight', { error: true });
      sendToUI({ type: 'action-complete', action: 'highlight', success: false });
      return;
    }

    const color = HIGHLIGHT_COLORS[clusterIndex % HIGHLIGHT_COLORS.length];
    let count = 0;

    // Resolve nodes and switch page
    const { nodes, page } = await resolveNodes(nodeIds);
    ensureCorrectPage(page);

    for (const node of nodes) {
      try {
        // Try absoluteRenderBounds first (more accurate), then absoluteBoundingBox
        const bounds =
          ('absoluteRenderBounds' in node ? (node as any).absoluteRenderBounds : null) ||
          ('absoluteBoundingBox' in node ? (node as any).absoluteBoundingBox : null);

        if (!bounds || bounds.width === 0 || bounds.height === 0) continue;

        const rect = figma.createRectangle();
        rect.name = `[UVF] Highlight: ${node.name}`;
        rect.x = bounds.x - 3;
        rect.y = bounds.y - 3;
        rect.resize(bounds.width + 6, bounds.height + 6);
        rect.fills = [];
        rect.strokes = [{ type: 'SOLID', color }];
        rect.strokeWeight = 2;
        rect.dashPattern = [6, 4];
        rect.cornerRadius = 2;
        rect.locked = true;
        rect.setPluginData('uvf-highlight', 'true');

        figma.currentPage.appendChild(rect);
        count++;
      } catch (_) {
        // Skip individual node highlight errors
        continue;
      }
    }

    if (count > 0) {
      figma.notify(`Highlighted ${count} nodes`);
    } else {
      figma.notify('No nodes could be highlighted', { error: true });
    }

    sendToUI({ type: 'action-complete', action: 'highlight', success: count > 0, message: `Highlighted ${count} nodes` });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    figma.notify(`Highlight failed: ${errorMsg}`, { error: true });
    console.error('UVF handleHighlightCluster:', err);
    sendToUI({ type: 'action-complete', action: 'highlight', success: false, message: errorMsg });
  }
}

function handleClearHighlights(): void {
  try {
    const highlights = figma.currentPage.findAll(
      node => node.getPluginData('uvf-highlight') === 'true'
    );
    for (const h of highlights) {
      try { h.remove(); } catch (_) { /* skip */ }
    }

    figma.notify(`Removed ${highlights.length} highlight${highlights.length !== 1 ? 's' : ''}`);
    sendToUI({ type: 'action-complete', action: 'clear-highlights', success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    figma.notify(`Clear failed: ${errorMsg}`, { error: true });
    console.error('UVF handleClearHighlights:', err);
    sendToUI({ type: 'action-complete', action: 'clear-highlights', success: false, message: errorMsg });
  }
}

async function handleComponentize(nodeIds: string[]): Promise<void> {
  try {
    if (!nodeIds || nodeIds.length < 2) {
      figma.notify('Need at least 2 nodes to componentize', { error: true });
      sendToUI({ type: 'action-complete', action: 'componentize', success: false, message: 'Need 2+ nodes' });
      return;
    }

    // Resolve nodes and switch page
    const { nodes, page } = await resolveNodes(nodeIds);
    ensureCorrectPage(page);

    if (nodes.length < 2) {
      figma.notify('Could not find 2+ valid nodes', { error: true });
      sendToUI({ type: 'action-complete', action: 'componentize', success: false });
      return;
    }

    const primaryNode = nodes[0];
    const component = figma.createComponentFromNode(primaryNode);
    component.name = primaryNode.name.replace(/\s*\d+$/, '');

    let replacedCount = 0;

    for (let i = 1; i < nodes.length; i++) {
      const dupNode = nodes[i];

      try {
        const instance = component.createInstance();
        instance.x = dupNode.x;
        instance.y = dupNode.y;
        instance.resize(dupNode.width, dupNode.height);

        // Insert instance at the same position in the parent's child list
        if (dupNode.parent && 'insertChild' in dupNode.parent) {
          const parentNode = dupNode.parent as FrameNode;
          const childArray = [...parentNode.children];
          const index = childArray.findIndex(c => c.id === dupNode.id);
          if (index >= 0) {
            parentNode.insertChild(index, instance);
          }
        }

        dupNode.remove();
        replacedCount++;
      } catch (innerErr) {
        console.error(`UVF componentize node ${dupNode.id}:`, innerErr);
        // Continue with remaining nodes
      }
    }

    // Clear geometry cache — nodes were mutated/deleted
    clearGeometryCache();

    figma.notify(`Created component "${component.name}" + ${replacedCount} instance${replacedCount !== 1 ? 's' : ''}`);
    sendToUI({ type: 'action-complete', action: 'componentize', success: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    figma.notify(`Componentize failed: ${errorMsg}`, { error: true });
    console.error('UVF handleComponentize:', err);
    sendToUI({
      type: 'action-complete',
      action: 'componentize',
      success: false,
      message: errorMsg,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// 6. Container detection — Frame, Group, Component, Section, Instance
// ══════════════════════════════════════════════════════════════════════

const CONTAINER_TYPES = new Set([
  'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'SECTION', 'INSTANCE',
]);

/**
 * Detect if the selection contains a single container node.
 * Returns ContainerInfo if a container is selected (and no vector is selected).
 * Priority: vector selection > container selection.
 */
function detectContainerSelection(selection: readonly SceneNode[]): ContainerInfo | undefined {
  if (selection.length !== 1) return undefined;
  const node = selection[0];

  // If it's a vector, don't treat as container (vector mode takes priority)
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') return undefined;

  if (CONTAINER_TYPES.has(node.type)) {
    return { id: node.id, name: node.name, type: node.type };
  }

  return undefined;
}

// ══════════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════════

const HIGHLIGHT_COLORS: RGB[] = [
  { r: 1, g: 0.2, b: 0.2 },   // Red
  { r: 0.2, g: 0.6, b: 1 },   // Blue
  { r: 0.2, g: 0.8, b: 0.2 }, // Green
  { r: 1, g: 0.6, b: 0 },     // Orange
  { r: 0.6, g: 0.2, b: 1 },   // Purple
  { r: 1, g: 0.8, b: 0 },     // Yellow
];
