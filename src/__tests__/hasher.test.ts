import { generateFingerprint } from '../core/hasher';
import { normalizePaths } from '../core/normalizer';
import { parsePath } from '../core/path-parser';
import { ParsedPath } from '../types';

function makeParsed(data: string, windingRule = 'NONZERO'): ParsedPath[] {
  return [{ commands: parsePath(data), windingRule }];
}

function getFingerprint(data: string, tolerance: number, windingRule = 'NONZERO'): string {
  const parsed = makeParsed(data, windingRule);
  const normalized = normalizePaths(parsed, 100, 100);
  return generateFingerprint(normalized, tolerance);
}

describe('generateFingerprint', () => {
  test('exact mode: identical paths produce identical fingerprints', () => {
    const fp1 = getFingerprint('M 0 0 L 10 0 L 10 10 Z', 0);
    const fp2 = getFingerprint('M 0 0 L 10 0 L 10 10 Z', 0);
    expect(fp1).toBe(fp2);
  });

  test('exact mode: slightly different paths produce different fingerprints', () => {
    const fp1 = getFingerprint('M 0 0 L 10 0 L 10 10 Z', 0);
    const fp2 = getFingerprint('M 0 0 L 10.001 0 L 10 10 Z', 0);
    expect(fp1).not.toBe(fp2);
  });

  test('quantized mode: nearly identical paths produce same fingerprint', () => {
    const parsed1 = [{ commands: [
      { type: 'M' as const, args: [0, 0] },
      { type: 'L' as const, args: [0.501, 0] },
      { type: 'Z' as const, args: [] },
    ], windingRule: 'NONZERO' }];

    const parsed2 = [{ commands: [
      { type: 'M' as const, args: [0, 0] },
      { type: 'L' as const, args: [0.499, 0] },
      { type: 'Z' as const, args: [] },
    ], windingRule: 'NONZERO' }];

    const fp1 = generateFingerprint(parsed1, 0.5);
    const fp2 = generateFingerprint(parsed2, 0.5);
    expect(fp1).toBe(fp2);
  });

  test('quantized mode: very different paths produce different fingerprints', () => {
    const parsed1 = [{ commands: [
      { type: 'M' as const, args: [0, 0] },
      { type: 'L' as const, args: [1, 0] },
      { type: 'Z' as const, args: [] },
    ], windingRule: 'NONZERO' }];

    const parsed2 = [{ commands: [
      { type: 'M' as const, args: [0, 0] },
      { type: 'L' as const, args: [5, 0] },
      { type: 'Z' as const, args: [] },
    ], windingRule: 'NONZERO' }];

    const fp1 = generateFingerprint(parsed1, 0.5);
    const fp2 = generateFingerprint(parsed2, 0.5);
    expect(fp1).not.toBe(fp2);
  });

  test('different winding rules produce different fingerprints', () => {
    const fp1 = getFingerprint('M 0 0 L 10 0 L 10 10 Z', 0, 'NONZERO');
    const fp2 = getFingerprint('M 0 0 L 10 0 L 10 10 Z', 0, 'EVENODD');
    expect(fp1).not.toBe(fp2);
  });

  test('scale-independent: same shape different size -> same fingerprint', () => {
    const parsedSmall = makeParsed('M 0 0 L 10 0 L 10 10 Z');
    const parsedLarge = makeParsed('M 0 0 L 100 0 L 100 100 Z');

    const normSmall = normalizePaths(parsedSmall, 10, 10);
    const normLarge = normalizePaths(parsedLarge, 100, 100);

    const fpSmall = generateFingerprint(normSmall, 0);
    const fpLarge = generateFingerprint(normLarge, 0);

    expect(fpSmall).toBe(fpLarge);
  });
});
