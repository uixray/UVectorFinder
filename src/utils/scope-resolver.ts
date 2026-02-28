import { SearchScope } from '../types';

/**
 * Resolve the root node for a given search scope.
 * Uses the current selection to determine frame/section context.
 */
export function resolveScopeRoot(scope: SearchScope): BaseNode & ChildrenMixin {
  switch (scope) {
    case 'frame':
      return resolveFrameRoot();
    case 'section':
      return resolveSectionRoot();
    case 'page':
      return figma.currentPage;
    case 'file':
      return figma.root as unknown as BaseNode & ChildrenMixin;
    default:
      return figma.currentPage;
  }
}

function resolveFrameRoot(): BaseNode & ChildrenMixin {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    let node: BaseNode | null = selection[0];
    while (node) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
        return node as BaseNode & ChildrenMixin;
      }
      node = node.parent;
    }
  }
  // Fallback to page
  return figma.currentPage;
}

function resolveSectionRoot(): BaseNode & ChildrenMixin {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    let node: BaseNode | null = selection[0];
    while (node) {
      if (node.type === 'SECTION') {
        return node as BaseNode & ChildrenMixin;
      }
      node = node.parent;
    }
    // Fallback to frame
    return resolveFrameRoot();
  }
  return figma.currentPage;
}

/**
 * Determine available scopes based on current selection context.
 */
export function getAvailableScopes(): { scope: SearchScope; available: boolean }[] {
  const selection = figma.currentPage.selection;
  let hasFrame = false;
  let hasSection = false;

  if (selection.length > 0) {
    let node: BaseNode | null = selection[0];
    while (node) {
      if (!hasFrame && (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')) {
        hasFrame = true;
      }
      if (!hasSection && node.type === 'SECTION') {
        hasSection = true;
      }
      node = node.parent;
    }
  }

  return [
    { scope: 'frame', available: hasFrame },
    { scope: 'section', available: hasSection },
    { scope: 'page', available: true },
    { scope: 'file', available: true },
  ];
}
