import { SearchScope, SearchFilters } from '../types';
import { resolveScopeRoot } from '../utils/scope-resolver';

type VectorLikeNode = VectorNode | BooleanOperationNode;

/**
 * Collect all target vector nodes within the given scope, applying filters.
 */
export async function collectNodes(
  scope: SearchScope,
  filters: SearchFilters
): Promise<VectorLikeNode[]> {
  // Optimize: skip invisible children inside instances when not searching hidden
  figma.skipInvisibleInstanceChildren = !filters.includeHidden;

  // For file-scope, load all pages first
  if (scope === 'file') {
    await figma.loadAllPagesAsync();
  }

  const root = resolveScopeRoot(scope);

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
