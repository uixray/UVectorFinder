import { ComparisonMethod } from '../types';

interface VectorPathData {
  data: string;
  windingRule: string;
}

/**
 * Extract geometry data from a vector-like node.
 * Returns array of path data objects, or null if no geometry available.
 */
export function extractGeometry(
  node: VectorNode | BooleanOperationNode,
  method: ComparisonMethod
): VectorPathData[] | null {
  try {
    if (method === 'fillGeometry') {
      const geom = node.fillGeometry;
      if (geom && geom.length > 0) {
        return geom.map(g => ({ data: g.data, windingRule: g.windingRule }));
      }
      return null;
    }

    if (method === 'vectorPaths') {
      // vectorPaths is only on VectorNode (via VectorLikeMixin)
      if ('vectorPaths' in node) {
        const vn = node as VectorNode;
        const paths = vn.vectorPaths;
        if (paths && paths.length > 0) {
          return paths.map(p => ({ data: p.data, windingRule: p.windingRule }));
        }
      }
      return null;
    }

    return null;
  } catch (e) {
    // Some nodes may throw when accessing geometry
    return null;
  }
}
