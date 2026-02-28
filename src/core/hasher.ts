import { ParsedPath } from '../types';

/**
 * Generate a fingerprint string from normalized paths.
 * tolerance=0: exact string comparison
 * tolerance>0: quantize coordinates to grid, then stringify
 */
export function generateFingerprint(paths: ParsedPath[], tolerance: number): string {
  const data = paths.map(path => ({
    w: path.windingRule,
    c: path.commands.map(cmd => ({
      t: cmd.type,
      a: tolerance > 0
        ? cmd.args.map(v => quantize(v, tolerance))
        : cmd.args,
    })),
  }));

  // Sort sub-paths for stable comparison (order may vary)
  data.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);

  return JSON.stringify(data);
}

/**
 * Quantize a value to the nearest grid point defined by tolerance.
 * Rounds to fixed precision to avoid floating point artifacts.
 */
function quantize(value: number, tolerance: number): number {
  const quantized = Math.round(value / tolerance) * tolerance;
  // Round to 6 decimal places to avoid floating-point noise
  return Math.round(quantized * 1e6) / 1e6;
}
