import { parsePath } from '../core/path-parser';

describe('parsePath', () => {
  test('parses empty string', () => {
    expect(parsePath('')).toEqual([]);
    expect(parsePath('   ')).toEqual([]);
  });

  test('parses simple triangle', () => {
    const cmds = parsePath('M 0 0 L 10 0 L 5 8.66 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'L', args: [10, 0] },
      { type: 'L', args: [5, 8.66] },
      { type: 'Z', args: [] },
    ]);
  });

  test('parses diamond shape', () => {
    const cmds = parsePath('M 0 12 L 12 0 L 24 12 L 12 24 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 12] },
      { type: 'L', args: [12, 0] },
      { type: 'L', args: [24, 12] },
      { type: 'L', args: [12, 24] },
      { type: 'Z', args: [] },
    ]);
  });

  test('parses cubic bezier curve', () => {
    const cmds = parsePath('M 0 0 C 0 5.5 5.5 10 10 10');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'C', args: [0, 5.5, 5.5, 10, 10, 10] },
    ]);
  });

  test('parses quadratic bezier curve', () => {
    const cmds = parsePath('M 0 0 Q 5 10 10 0 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'Q', args: [5, 10, 10, 0] },
      { type: 'Z', args: [] },
    ]);
  });

  test('parses multiple subpaths', () => {
    const cmds = parsePath('M 0 0 L 10 0 Z M 20 20 L 30 20 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'L', args: [10, 0] },
      { type: 'Z', args: [] },
      { type: 'M', args: [20, 20] },
      { type: 'L', args: [30, 20] },
      { type: 'Z', args: [] },
    ]);
  });

  test('handles negative coordinates', () => {
    const cmds = parsePath('M -5 -10 L 5 -3.5 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [-5, -10] },
      { type: 'L', args: [5, -3.5] },
      { type: 'Z', args: [] },
    ]);
  });

  test('handles decimal coordinates', () => {
    const cmds = parsePath('M 0.5 0.25 L 1.75 3.125');
    expect(cmds).toEqual([
      { type: 'M', args: [0.5, 0.25] },
      { type: 'L', args: [1.75, 3.125] },
    ]);
  });

  test('handles comma separators', () => {
    const cmds = parsePath('M 0,0 L 10,5 Z');
    expect(cmds).toEqual([
      { type: 'M', args: [0, 0] },
      { type: 'L', args: [10, 5] },
      { type: 'Z', args: [] },
    ]);
  });

  test('handles scientific notation', () => {
    const cmds = parsePath('M 1.5e2 2.5E-1 L 0 0');
    expect(cmds).toEqual([
      { type: 'M', args: [150, 0.25] },
      { type: 'L', args: [0, 0] },
    ]);
  });

  test('complex icon path (realistic Figma output)', () => {
    const cmds = parsePath(
      'M 12 2 C 6.48 2 2 6.48 2 12 C 2 17.52 6.48 22 12 22 C 17.52 22 22 17.52 22 12 C 22 6.48 17.52 2 12 2 Z'
    );
    expect(cmds).toHaveLength(6);
    expect(cmds[0]).toEqual({ type: 'M', args: [12, 2] });
    expect(cmds[5]).toEqual({ type: 'Z', args: [] });
    // All 4 cubic bezier commands have 6 args each
    for (let i = 1; i <= 4; i++) {
      expect(cmds[i].type).toBe('C');
      expect(cmds[i].args).toHaveLength(6);
    }
  });
});
