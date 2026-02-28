import { PathCommand, ParsedPath } from '../types';

/**
 * Normalize parsed paths: shift to origin (0,0) and scale to unit size.
 * This makes comparison independent of position and scale.
 */
export function normalizePaths(paths: ParsedPath[], width: number, height: number): ParsedPath[] {
  // Collect all coordinates from all paths
  const allCoords = extractAllCoordinates(paths);
  if (allCoords.length === 0) return paths;

  // Find bounds
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < allCoords.length; i += 2) {
    const x = allCoords[i];
    const y = allCoords[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = Math.max(rangeX, rangeY);

  // If all points are the same (degenerate), return as-is
  if (scale === 0) return paths;

  return paths.map(path => ({
    windingRule: path.windingRule,
    commands: path.commands.map(cmd => ({
      type: cmd.type,
      args: transformArgs(cmd, minX, minY, scale),
    })),
  }));
}

/**
 * Extract all x,y coordinate pairs from all paths.
 * Returns flat array: [x0, y0, x1, y1, ...]
 */
function extractAllCoordinates(paths: ParsedPath[]): number[] {
  const coords: number[] = [];

  for (const path of paths) {
    for (const cmd of path.commands) {
      // All args are coordinate pairs (x, y) except Z which has no args
      // M: [x, y], L: [x, y], Q: [cx, cy, x, y], C: [cx1, cy1, cx2, cy2, x, y]
      for (let i = 0; i < cmd.args.length; i++) {
        coords.push(cmd.args[i]);
      }
    }
  }

  return coords;
}

/**
 * Transform command arguments: shift by (minX, minY), then scale.
 */
function transformArgs(cmd: PathCommand, minX: number, minY: number, scale: number): number[] {
  if (cmd.args.length === 0) return [];

  const result: number[] = [];
  for (let i = 0; i < cmd.args.length; i += 2) {
    // x coordinate
    result.push((cmd.args[i] - minX) / scale);
    // y coordinate
    if (i + 1 < cmd.args.length) {
      result.push((cmd.args[i + 1] - minY) / scale);
    }
  }
  return result;
}
