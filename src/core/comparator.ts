import {
  SearchConfig,
  SearchResult,
  SearchProgress,
  DuplicateCluster,
  VectorNodeInfo,
  ParsedPath,
} from '../types';
import { BATCH_SIZE } from '../constants';
import { collectNodes } from './collector';
import { extractGeometry } from './extractor';
import { parsePath } from './path-parser';
import { normalizePaths } from './normalizer';
import { generateFingerprint } from './hasher';

let cancelFlag = false;

export function cancelSearch(): void {
  cancelFlag = true;
}

/**
 * Main search orchestrator: collect → extract → normalize → hash → cluster.
 */
export async function runSearch(
  config: SearchConfig,
  onProgress: (progress: SearchProgress) => void
): Promise<SearchResult> {
  cancelFlag = false;
  const startTime = Date.now();

  // Phase 1: Selection-mode — compute target fingerprint
  let targetFingerprint: string | null = null;

  if (config.mode === 'selection') {
    const selection = figma.currentPage.selection;
    const targetNode = selection.find(
      n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION'
    ) as (VectorNode | BooleanOperationNode) | undefined;

    if (!targetNode) {
      return emptyResult(config, Date.now() - startTime);
    }

    const targetGeometry = extractGeometry(targetNode, config.method);
    if (!targetGeometry || targetGeometry.length === 0) {
      return emptyResult(config, Date.now() - startTime);
    }

    const targetParsed: ParsedPath[] = [];
    for (const g of targetGeometry) {
      const cmds = parsePath(g.data);
      if (cmds.length === 0) return emptyResult(config, Date.now() - startTime);
      targetParsed.push({ commands: cmds, windingRule: g.windingRule });
    }

    const targetNormalized = normalizePaths(targetParsed, targetNode.width, targetNode.height);
    targetFingerprint = generateFingerprint(targetNormalized, config.tolerance);
  }

  // Phase 2: Collect nodes
  onProgress({ phase: 'collecting', current: 0, total: 0, message: 'Collecting vector nodes...' });
  const nodes = await collectNodes(config.scope, config.filters, config.rootNodeId);

  if (nodes.length === 0) {
    return emptyResult(config, Date.now() - startTime);
  }

  // Phase 3: Extract, normalize, hash
  const fingerprintMap = new Map<string, VectorNodeInfo[]>();
  let processedCount = 0;

  for (let i = 0; i < nodes.length; i++) {
    if (cancelFlag) {
      return emptyResult(config, Date.now() - startTime);
    }

    const node = nodes[i];

    // Report progress
    if (i % BATCH_SIZE === 0) {
      onProgress({
        phase: 'processing',
        current: i,
        total: nodes.length,
        message: `Processing ${i} / ${nodes.length} nodes...`,
      });
      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Extract geometry
    const geometry = extractGeometry(node, config.method);
    if (!geometry || geometry.length === 0) continue;

    // Parse path data
    const parsedPaths: ParsedPath[] = [];
    let validPaths = true;
    for (const g of geometry) {
      const commands = parsePath(g.data);
      if (commands.length === 0) {
        validPaths = false;
        break;
      }
      parsedPaths.push({ commands, windingRule: g.windingRule });
    }
    if (!validPaths) continue;

    // Normalize
    const normalized = normalizePaths(parsedPaths, node.width, node.height);

    // Generate fingerprint
    const fingerprint = generateFingerprint(normalized, config.tolerance);

    // Build node info
    const nodeInfo: VectorNodeInfo = {
      id: node.id,
      name: node.name,
      parentName: getParentName(node),
      width: Math.round(node.width * 10) / 10,
      height: Math.round(node.height * 10) / 10,
      visible: node.visible,
      locked: node.locked,
    };

    // Add page info for file-scope searches
    if (config.scope === 'file') {
      const page = getPage(node);
      if (page) {
        nodeInfo.pageId = page.id;
        nodeInfo.pageName = page.name;
      }
    }

    // In selection mode, only keep nodes matching the target fingerprint
    if (targetFingerprint !== null && fingerprint !== targetFingerprint) continue;

    // Add to fingerprint map
    if (!fingerprintMap.has(fingerprint)) {
      fingerprintMap.set(fingerprint, []);
    }
    fingerprintMap.get(fingerprint)!.push(nodeInfo);
    processedCount++;
  }

  // Phase 3: Cluster
  onProgress({ phase: 'clustering', current: 0, total: 0, message: 'Building clusters...' });

  const clusters: DuplicateCluster[] = [];
  let clusterIndex = 0;

  for (const [fingerprint, group] of fingerprintMap) {
    if (group.length >= 2) {
      clusters.push({
        id: `cluster-${clusterIndex}`,
        fingerprint,
        nodeCount: group.length,
        nodes: group,
      });
      clusterIndex++;
    }
  }

  // Sort by count descending
  clusters.sort((a, b) => b.nodeCount - a.nodeCount);

  const totalDuplicates = clusters.reduce((sum, c) => sum + c.nodeCount - 1, 0);

  onProgress({ phase: 'done', current: nodes.length, total: nodes.length, message: 'Done' });

  return {
    clusters,
    totalNodesScanned: nodes.length,
    totalClusters: clusters.length,
    totalDuplicates,
    duration: Date.now() - startTime,
    config,
  };
}

function emptyResult(config: SearchConfig, duration: number): SearchResult {
  return {
    clusters: [],
    totalNodesScanned: 0,
    totalClusters: 0,
    totalDuplicates: 0,
    duration,
    config,
  };
}

function getParentName(node: SceneNode): string {
  if (node.parent && 'name' in node.parent) {
    return node.parent.name;
  }
  return '';
}

function getPage(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current) {
    if (current.type === 'PAGE') return current as PageNode;
    current = current.parent;
  }
  return null;
}
