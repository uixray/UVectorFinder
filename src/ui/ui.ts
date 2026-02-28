import type {
  SandboxToUIMessage,
  UIToSandboxMessage,
  SearchConfig,
  PluginSettings,
  SearchResult,
  DuplicateCluster,
  SearchScope,
  ComparisonMethod,
  ContainerInfo,
} from '../types';

// ── Helpers ──

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function sendToSandbox(msg: UIToSandboxMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

function showPanel(id: string): void {
  const panels = ['settings-panel', 'progress-panel', 'results-panel', 'empty-panel', 'error-panel'];
  panels.forEach(p => $(p).classList.toggle('hidden', p !== id));
}

// ── State ──

let currentSettings: PluginSettings | null = null;
let hasSelection = false;
let selectionName = '';
let containerSelection: ContainerInfo | undefined = undefined;
let lastResult: SearchResult | null = null;
let pendingComponentizeIds: string[] | null = null;

const BADGE_COLORS = ['#e74c3c', '#3498db', '#27ae60', '#e67e22', '#9b59b6', '#f1c40f'];

// ── Init ──

function init(): void {
  setupToleranceControls();
  setupButtons();
  sendToSandbox({ type: 'load-settings' });
}

// ── Tolerance Controls ──

function setupToleranceControls(): void {
  const slider = $('tolerance-slider') as HTMLInputElement;
  const input = $('tolerance-input') as HTMLInputElement;
  const chips = $('tolerance-chips');

  slider.addEventListener('input', () => {
    const val = slider.value;
    input.value = val;
    updateChipSelection(parseFloat(val));
  });

  input.addEventListener('change', () => {
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 10) val = 10;
    input.value = String(val);
    slider.value = String(val);
    updateChipSelection(val);
  });

  chips.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chip')) {
      const val = parseFloat(target.dataset.value || '0');
      slider.value = String(val);
      input.value = String(val);
      updateChipSelection(val);
    }
  });
}

function updateChipSelection(value: number): void {
  const chips = $('tolerance-chips').querySelectorAll('.chip');
  chips.forEach(chip => {
    const chipVal = parseFloat((chip as HTMLElement).dataset.value || '-1');
    chip.classList.toggle('active', chipVal === value);
  });
}

// ── Buttons ──

function setupButtons(): void {
  $('btn-search').addEventListener('click', startSearch);
  $('btn-cancel').addEventListener('click', () => sendToSandbox({ type: 'cancel-search' }));
  $('btn-back').addEventListener('click', () => showPanel('settings-panel'));
  $('btn-back-empty').addEventListener('click', () => showPanel('settings-panel'));
  $('btn-back-error').addEventListener('click', () => showPanel('settings-panel'));
  $('btn-clear-highlights').addEventListener('click', () => sendToSandbox({ type: 'clear-highlights' }));
  $('btn-clear-highlights-settings').addEventListener('click', () => sendToSandbox({ type: 'clear-highlights' }));

  // Modal
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-confirm').addEventListener('click', () => {
    if (pendingComponentizeIds) {
      sendToSandbox({ type: 'componentize-cluster', nodeIds: pendingComponentizeIds });
      pendingComponentizeIds = null;
    }
    closeModal();
  });
}

function closeModal(): void {
  $('modal-overlay').classList.remove('visible');
  pendingComponentizeIds = null;
}

// ── Build Config ──

function buildConfig(): SearchConfig {
  const scopeRadio = document.querySelector('input[name="scope"]:checked') as HTMLInputElement;
  const methodRadio = document.querySelector('input[name="method"]:checked') as HTMLInputElement;
  const tolerance = parseFloat(($('tolerance-input') as HTMLInputElement).value) || 0;
  const includeHidden = ($('filter-hidden') as HTMLInputElement).checked;
  const includeLocked = ($('filter-locked') as HTMLInputElement).checked;

  const config: SearchConfig = {
    mode: hasSelection ? 'selection' : 'fullScan',
    scope: (scopeRadio?.value || 'page') as SearchScope,
    method: (methodRadio?.value || 'vectorPaths') as ComparisonMethod,
    tolerance,
    filters: { includeHidden, includeLocked },
  };

  // When a container (Frame/Group/Component/Section) is selected,
  // use it as the search root — ignore the scope radio
  if (!hasSelection && containerSelection) {
    config.rootNodeId = containerSelection.id;
  }

  return config;
}

function startSearch(): void {
  const config = buildConfig();

  // Save settings
  const settings: PluginSettings = {
    version: 1,
    scope: config.scope,
    method: config.method,
    tolerance: config.tolerance,
    filters: config.filters,
  };
  sendToSandbox({ type: 'save-settings', settings });

  // Start
  showPanel('progress-panel');
  $('progress-fill').style.width = '0%';
  $('progress-text').textContent = 'Starting search...';
  sendToSandbox({ type: 'start-search', config });
}

// ── Apply Settings to UI ──

function applySettings(settings: PluginSettings): void {
  currentSettings = settings;

  // Scope
  const scopeRadio = document.querySelector(`input[name="scope"][value="${settings.scope}"]`) as HTMLInputElement;
  if (scopeRadio) scopeRadio.checked = true;

  // Method
  const methodRadio = document.querySelector(`input[name="method"][value="${settings.method}"]`) as HTMLInputElement;
  if (methodRadio) methodRadio.checked = true;

  // Tolerance
  ($('tolerance-slider') as HTMLInputElement).value = String(settings.tolerance);
  ($('tolerance-input') as HTMLInputElement).value = String(settings.tolerance);
  updateChipSelection(settings.tolerance);

  // Filters
  ($('filter-hidden') as HTMLInputElement).checked = settings.filters.includeHidden;
  ($('filter-locked') as HTMLInputElement).checked = settings.filters.includeLocked;
}

// ── Update Selection Display ──

function updateSelectionUI(has: boolean, name?: string, container?: ContainerInfo): void {
  hasSelection = has;
  selectionName = name || '';
  containerSelection = container;

  const vectorInfo = $('selection-info');
  const containerInfo = $('container-info');
  const btn = $('btn-search');

  // Reset both info bars
  vectorInfo.classList.add('hidden');
  containerInfo.classList.add('hidden');

  if (has) {
    // Vector selected — selection mode (find duplicates of this vector)
    vectorInfo.classList.remove('hidden');
    $('selection-name').textContent = name || 'Unknown';
    btn.textContent = 'Search Selected';
  } else if (container) {
    // Container selected — search within this container
    containerInfo.classList.remove('hidden');
    const friendlyType = container.type.charAt(0) + container.type.slice(1).toLowerCase();
    $('container-type').textContent = friendlyType;
    $('container-name').textContent = container.name;
    btn.textContent = `Search in ${friendlyType}`;
  } else {
    // Nothing selected — full scan
    btn.textContent = 'Search Duplicates';
  }
}

// ── Render Results ──

function renderResults(result: SearchResult): void {
  lastResult = result;

  if (result.clusters.length === 0) {
    showPanel('empty-panel');
    return;
  }

  showPanel('results-panel');

  // Summary
  const dur = (result.duration / 1000).toFixed(1);
  $('results-summary').innerHTML =
    `Found <strong>${result.totalClusters}</strong> cluster${result.totalClusters !== 1 ? 's' : ''} ` +
    `(<strong>${result.totalDuplicates}</strong> duplicate${result.totalDuplicates !== 1 ? 's' : ''}) ` +
    `among ${result.totalNodesScanned} nodes in ${dur}s`;

  // Clusters
  const container = $('clusters-list');
  container.innerHTML = '';

  result.clusters.forEach((cluster, idx) => {
    container.appendChild(createClusterElement(cluster, idx));
  });
}

function createClusterElement(cluster: DuplicateCluster, index: number): HTMLElement {
  const color = BADGE_COLORS[index % BADGE_COLORS.length];
  const div = document.createElement('div');
  div.className = 'cluster';

  // Header
  const header = document.createElement('div');
  header.className = 'cluster-header';
  header.innerHTML = `
    <div class="cluster-title">
      <span class="cluster-badge" style="background:${color}">${cluster.nodeCount}</span>
      Group ${index + 1}
      <span style="font-weight:normal;color:var(--figma-color-text-tertiary,#999);font-size:10px">
        ${cluster.nodes[0]?.width}x${cluster.nodes[0]?.height}
      </span>
    </div>
    <span class="cluster-arrow">&#9654;</span>
  `;
  header.addEventListener('click', () => div.classList.toggle('open'));

  // Body
  const body = document.createElement('div');
  body.className = 'cluster-body';

  // Cluster actions
  const actions = document.createElement('div');
  actions.className = 'cluster-actions';

  const btnSelectAll = createBtn('Select All', () => {
    sendToSandbox({ type: 'select-nodes', nodeIds: cluster.nodes.map(n => n.id) });
  });
  const btnHighlight = createBtn('Highlight', () => {
    sendToSandbox({ type: 'highlight-cluster', nodeIds: cluster.nodes.map(n => n.id), clusterIndex: index });
  });
  const btnComponent = createBtn('To Component', () => {
    pendingComponentizeIds = cluster.nodes.map(n => n.id);
    $('modal-text').textContent =
      `This will convert ${cluster.nodeCount} vectors into 1 component + ${cluster.nodeCount - 1} instances. This action modifies your file.`;
    $('modal-overlay').classList.add('visible');
  });

  actions.appendChild(btnSelectAll);
  actions.appendChild(btnHighlight);
  actions.appendChild(btnComponent);
  body.appendChild(actions);

  // Node list
  cluster.nodes.forEach(node => {
    const item = document.createElement('div');
    item.className = 'node-item';
    item.innerHTML = `
      <div class="node-info">
        <div class="node-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</div>
        <div class="node-meta">${node.width}x${node.height} &middot; ${escapeHtml(node.parentName)}${node.pageName ? ' &middot; ' + escapeHtml(node.pageName) : ''}</div>
      </div>
      <div class="node-actions">
        <button class="btn-icon" title="Zoom to node">&#x1F50D;</button>
      </div>
    `;

    const zoomBtn = item.querySelector('.btn-icon')!;
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sendToSandbox({ type: 'zoom-to-node', nodeId: node.id });
    });

    item.addEventListener('click', () => {
      sendToSandbox({ type: 'select-nodes', nodeIds: [node.id] });
    });

    body.appendChild(item);
  });

  div.appendChild(header);
  div.appendChild(body);

  // Open first cluster by default
  if (index === 0) div.classList.add('open');

  return div;
}

function createBtn(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn-secondary';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Toast notifications ──

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-remove after animation
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

// ── Message Handler ──

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as SandboxToUIMessage;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'settings-loaded':
      applySettings(msg.settings);
      updateSelectionUI(msg.hasSelection, msg.selectionName, msg.containerSelection);
      break;

    case 'search-progress': {
      const p = msg.progress;
      if (p.total > 0) {
        const pct = Math.round((p.current / p.total) * 100);
        $('progress-fill').style.width = pct + '%';
      }
      $('progress-text').textContent = p.message;
      break;
    }

    case 'search-complete':
      renderResults(msg.result);
      break;

    case 'search-error':
      showPanel('error-panel');
      $('error-message').textContent = msg.error;
      break;

    case 'selection-changed':
      updateSelectionUI(msg.hasSelection, msg.selectionName, msg.containerSelection);
      break;

    case 'action-complete':
      if (!msg.success && msg.message) {
        showToast(`${msg.action} failed: ${msg.message}`, 'error');
      }
      break;
  }
};

// ── Start ──
init();
