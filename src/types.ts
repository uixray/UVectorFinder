// ============================================================================
// Search Configuration
// ============================================================================

export type SearchScope = 'frame' | 'section' | 'page' | 'file';
export type ComparisonMethod = 'fillGeometry' | 'vectorPaths';
export type SearchMode = 'selection' | 'fullScan';

export interface SearchFilters {
  includeHidden: boolean;
  includeLocked: boolean;
}

export interface SearchConfig {
  mode: SearchMode;
  scope: SearchScope;
  method: ComparisonMethod;
  tolerance: number;
  filters: SearchFilters;
  /** When set, search WITHIN this specific container node (Frame/Group/Component) */
  rootNodeId?: string;
}

// ============================================================================
// Geometry Types
// ============================================================================

export type PathCommandType = 'M' | 'L' | 'Q' | 'C' | 'Z';

export interface PathCommand {
  type: PathCommandType;
  args: number[];
}

export interface ParsedPath {
  commands: PathCommand[];
  windingRule: string;
}

export interface NormalizedGeometry {
  paths: ParsedPath[];
  fingerprint: string;
}

// ============================================================================
// Search Results
// ============================================================================

export interface VectorNodeInfo {
  id: string;
  name: string;
  parentName: string;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  pageId?: string;
  pageName?: string;
}

export interface DuplicateCluster {
  id: string;
  fingerprint: string;
  nodeCount: number;
  nodes: VectorNodeInfo[];
}

export interface SearchResult {
  clusters: DuplicateCluster[];
  totalNodesScanned: number;
  totalClusters: number;
  totalDuplicates: number;
  duration: number;
  config: SearchConfig;
  /** Number of nodes resolved from geometry cache (0 on first run) */
  cacheHits: number;
  /** Total entries currently in the geometry cache */
  cacheSize: number;
}

// ============================================================================
// Plugin Settings (persisted)
// ============================================================================

export interface PluginSettings {
  version: number;
  scope: SearchScope;
  method: ComparisonMethod;
  tolerance: number;
  filters: SearchFilters;
}

// ============================================================================
// Container Selection Info
// ============================================================================

export interface ContainerInfo {
  id: string;
  name: string;
  type: string;
}

// ============================================================================
// Progress Reporting
// ============================================================================

export interface SearchProgress {
  phase: 'collecting' | 'processing' | 'clustering' | 'done';
  current: number;
  total: number;
  message: string;
}

// ============================================================================
// UI -> Sandbox Messages
// ============================================================================

export type UIToSandboxMessage =
  | { type: 'start-search'; config: SearchConfig }
  | { type: 'cancel-search' }
  | { type: 'load-settings' }
  | { type: 'save-settings'; settings: PluginSettings }
  | { type: 'select-nodes'; nodeIds: string[] }
  | { type: 'zoom-to-node'; nodeId: string }
  | { type: 'highlight-cluster'; nodeIds: string[]; clusterIndex: number }
  | { type: 'clear-highlights' }
  | { type: 'componentize-cluster'; nodeIds: string[] };

// ============================================================================
// Sandbox -> UI Messages
// ============================================================================

export type SandboxToUIMessage =
  | { type: 'settings-loaded'; settings: PluginSettings; hasSelection: boolean; selectionName?: string; containerSelection?: ContainerInfo }
  | { type: 'search-progress'; progress: SearchProgress }
  | { type: 'search-complete'; result: SearchResult }
  | { type: 'search-error'; error: string }
  | { type: 'selection-changed'; hasSelection: boolean; selectionName?: string; containerSelection?: ContainerInfo }
  | { type: 'action-complete'; action: string; success: boolean; message?: string };
