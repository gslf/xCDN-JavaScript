/**
 * xCDN - JavaScript Implementation
 *
 * A parser and serializer for the xCDN data format.
 */

// Re-export AST types
export * from './ast.js';

// Re-export error types
export * from './error.js';

// Re-export lexer
export * from './lexer.js';

// Re-export parser
export { Parser, parseStr, parseReader } from './parser.js';

// Re-export serializer
export {
  Format,
  Serializer,
  toStringPretty,
  toStringCompact,
  toStringWithFormat
} from './serializer.js';

// Default export for convenience
import { parseStr } from './parser.js';
import { toStringPretty, toStringCompact } from './serializer.js';

export default {
  parse: parseStr,
  stringify: toStringPretty,
  stringifyCompact: toStringCompact
};
