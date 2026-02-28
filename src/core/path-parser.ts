import { PathCommand, PathCommandType } from '../types';
import { COMMAND_ARG_COUNTS } from '../constants';

const VALID_COMMANDS = new Set(['M', 'L', 'Q', 'C', 'Z']);

/**
 * Parse SVG path data string into structured commands.
 * Figma uses only absolute commands: M, L, Q, C, Z separated by spaces.
 */
export function parsePath(data: string): PathCommand[] {
  if (!data || !data.trim()) return [];

  const tokens = tokenize(data);
  const commands: PathCommand[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (VALID_COMMANDS.has(token)) {
      const type = token as PathCommandType;
      const expectedArgs = COMMAND_ARG_COUNTS[type];
      const args: number[] = [];

      for (let j = 0; j < expectedArgs; j++) {
        i++;
        if (i >= tokens.length) break;
        const num = parseFloat(tokens[i]);
        if (isNaN(num)) break;
        args.push(num);
      }

      // Accept the command if it has the right number of args (or Z with 0)
      if (args.length === expectedArgs) {
        commands.push({ type, args });
      }

      i++;
    } else {
      // Skip unexpected tokens
      i++;
    }
  }

  return commands;
}

/**
 * Tokenize path data string. Handles negative numbers and decimals.
 */
function tokenize(data: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = data.length;

  while (i < len) {
    const ch = data[i];

    // Skip whitespace and commas
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',') {
      i++;
      continue;
    }

    // Command letter
    if (VALID_COMMANDS.has(ch) || VALID_COMMANDS.has(ch.toUpperCase())) {
      tokens.push(ch.toUpperCase());
      i++;
      continue;
    }

    // Number (possibly negative, possibly decimal, possibly scientific notation)
    if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) {
      let num = '';
      if (ch === '-' || ch === '+') {
        num += ch;
        i++;
      }
      // Integer part
      while (i < len && data[i] >= '0' && data[i] <= '9') {
        num += data[i];
        i++;
      }
      // Decimal part
      if (i < len && data[i] === '.') {
        num += '.';
        i++;
        while (i < len && data[i] >= '0' && data[i] <= '9') {
          num += data[i];
          i++;
        }
      }
      // Scientific notation
      if (i < len && (data[i] === 'e' || data[i] === 'E')) {
        num += data[i];
        i++;
        if (i < len && (data[i] === '+' || data[i] === '-')) {
          num += data[i];
          i++;
        }
        while (i < len && data[i] >= '0' && data[i] <= '9') {
          num += data[i];
          i++;
        }
      }
      if (num && num !== '-' && num !== '+' && num !== '.') {
        tokens.push(num);
      }
      continue;
    }

    // Skip unknown characters
    i++;
  }

  return tokens;
}
