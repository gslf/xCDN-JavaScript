/**
 * xCDN Error Module
 * Error handling for the xCDN parser
 */

/**
 * Represents a position in the source code
 */
export class Span {
  /**
   * @param {number} offset - Absolute byte offset
   * @param {number} line - Line number (1-indexed)
   * @param {number} column - Column number (1-indexed)
   */
  constructor(offset, line, column) {
    this.offset = offset;
    this.line = line;
    this.column = column;
  }

  toString() {
    return `${this.line}:${this.column}`;
  }

  clone() {
    return new Span(this.offset, this.line, this.column);
  }
}

/**
 * Possible error types
 */
export const ErrorKind = {
  Eof: 'Eof',
  InvalidToken: 'InvalidToken',
  Expected: 'Expected',
  InvalidEscape: 'InvalidEscape',
  InvalidNumber: 'InvalidNumber',
  InvalidDecimal: 'InvalidDecimal',
  InvalidDateTime: 'InvalidDateTime',
  InvalidDuration: 'InvalidDuration',
  InvalidUuid: 'InvalidUuid',
  InvalidBase64: 'InvalidBase64',
  Message: 'Message',
};

/**
 * xCDN error with position information
 */
export class XCDNError extends Error {
  /**
   * @param {string} kind - Error type (from ErrorKind)
   * @param {Span} span - Error position
   * @param {string} [context] - Additional context
   */
  constructor(kind, span, context = null) {
    const message = XCDNError.formatMessage(kind, context, span);
    super(message);
    this.name = 'XCDNError';
    this.kind = kind;
    this.span = span;
    this.context = context;
  }

  static formatMessage(kind, context, span) {
    let msg;
    switch (kind) {
      case ErrorKind.Eof:
        msg = 'Unexpected end of input';
        break;
      case ErrorKind.InvalidToken:
        msg = `Invalid token: ${context}`;
        break;
      case ErrorKind.Expected:
        msg = context; // "Expected X, found Y"
        break;
      case ErrorKind.InvalidEscape:
        msg = 'Invalid escape sequence';
        break;
      case ErrorKind.InvalidNumber:
        msg = 'Invalid number format';
        break;
      case ErrorKind.InvalidDecimal:
        msg = `Invalid decimal value: ${context}`;
        break;
      case ErrorKind.InvalidDateTime:
        msg = `Invalid datetime value: ${context}`;
        break;
      case ErrorKind.InvalidDuration:
        msg = `Invalid duration value: ${context}`;
        break;
      case ErrorKind.InvalidUuid:
        msg = `Invalid UUID value: ${context}`;
        break;
      case ErrorKind.InvalidBase64:
        msg = `Invalid base64 value: ${context}`;
        break;
      case ErrorKind.Message:
        msg = context;
        break;
      default:
        msg = context || 'Unknown error';
    }
    return `${msg} at ${span.toString()}`;
  }
}
