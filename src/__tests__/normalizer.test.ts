import { normalizePaths } from '../core/normalizer';
import { parsePath } from '../core/path-parser';
import { ParsedPath } from '../types';

function makeParsed(data: string, windingRule = 'NONZERO'): ParsedPath[] {
  return [{ commands: parsePath(data), windingRule }];
}

describe('normalizePaths', () => {
  test('same shape at different positions normalizes identically', () => {
    const pathA = makeParsed('M 0 0 L 10 0 L 10 10 L 0 10 Z');
    const pathB = makeParsed('M 100 200 L 110 200 L 110 210 L 100 210 Z');

    const normA = normalizePaths(pathA, 10, 10);
    const normB = normalizePaths(pathB, 10, 10);

    expect(JSON.stringify(normA)).toBe(JSON.stringify(normB));
  });

  test('same shape at different scales normalizes identically', () => {
    // Diamond 24x24
    const pathA = makeParsed('M 0 12 L 12 0 L 24 12 L 12 24 Z');
    // Diamond 48x48
    const pathB = makeParsed('M 0 24 L 24 0 L 48 24 L 24 48 Z');

    const normA = normalizePaths(pathA, 24, 24);
    const normB = normalizePaths(pathB, 48, 48);

    expect(JSON.stringify(normA)).toBe(JSON.stringify(normB));
  });

  test('different aspect ratios produce different output', () => {
    // 10x10 square
    const pathA = makeParsed('M 0 0 L 10 0 L 10 10 L 0 10 Z');
    // 20x10 rectangle (2:1 ratio)
    const pathB = makeParsed('M 0 0 L 20 0 L 20 10 L 0 10 Z');

    const normA = normalizePaths(pathA, 10, 10);
    const normB = normalizePaths(pathB, 20, 10);

    expect(JSON.stringify(normA)).not.toBe(JSON.stringify(normB));
  });

  test('degenerate path (single point) returns as-is', () => {
    const path = makeParsed('M 5 5');
    const normalized = normalizePaths(path, 0, 0);

    // Should not throw, returns paths unchanged since scale=0
    expect(normalized[0].commands[0].args).toEqual([5, 5]);
  });

  test('normalizes bezier control points too', () => {
    const pathA = makeParsed('M 0 0 C 0 5 5 10 10 10');
    const pathB = makeParsed('M 0 0 C 0 10 10 20 20 20');

    const normA = normalizePaths(pathA, 10, 10);
    const normB = normalizePaths(pathB, 20, 20);

    expect(JSON.stringify(normA)).toBe(JSON.stringify(normB));
  });

  test('empty paths return empty', () => {
    const result = normalizePaths([], 0, 0);
    expect(result).toEqual([]);
  });
});
