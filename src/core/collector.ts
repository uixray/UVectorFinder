import { SearchScope, SearchFilters } from '../types';
import { resolveScopeRoot } from '../utils/scope-resolver';

type VectorLikeNode = VectorNode | BooleanOperationNode;

/**
 * Collect all target vector nodes within the given scope, applying filters.
 * When rootNodeId is provided, uses that node directly as the search root
 * (for container-scoped search: Frame, Group, Component, Section).
 */
export async function collectNodes(
  scope: SearchScope,
  filters: SearchFilters,
  rootNodeId?: string
): Promise<VectorLikeNode[]> {
  // Optimize: skip invisible children inside instances when not searching hidden
  figma.skipInvisibleInstanceChildren = !filters.includeHidden;

  let root: BaseNode & ChildrenMixin;

  if (rootNodeId) {
    // Container-scoped search: use the specific node as root
    const node = await figma.getNodeByIdAsync(rootNodeId);
    if (node && 'children' in node) {
      root = node as BaseNode & ChildrenMixin;
    } else {
      // Fallback to scope-based resolution
      root = resolveScopeRoot(scope);
    }
  } else {
    // For file-scope, load all pages first
    if (scope === 'file') {
      await figma.loadAllPagesAsync();
    }
    root = resolveScopeRoot(scope);
  }

  // Use findAllWithCriteria for performance
  const nodes = root.findAllWithCriteria({
    types: ['VECTOR', 'BOOLEAN_OPERATION'],
  }) as VectorLikeNode[];

  // Apply filters
  return nodes.filter(node => {
    if (!filters.includeHidden && !node.visible) return false;
    if (!filters.includeLocked && node.locked) return false;
    return true;
  });
}
