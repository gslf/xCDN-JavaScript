/**
 * xCDN Lexer Module
 * Tokenization for the xCDN format
 */

import { Span, XCDNError, ErrorKind } from './error.js';

/**
 * Token types
 */
export const TokenType = {
  // Structure
  LBRACE: 'LBRACE',         // {
  RBRACE: 'RBRACE',         // }
  LBRACKET: 'LBRACKET',     // [
  RBRACKET: 'RBRACKET',     // ]
  LPAREN: 'LPAREN',         // (
  RPAREN: 'RPAREN',         // )
  COLON: 'COLON',           // :
  COMMA: 'COMMA',           // ,
  DOLLAR: 'DOLLAR',         // $
  HASH: 'HASH',             // #
  AT: 'AT',                 // @

  // Keywords
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  NULL: 'NULL',

  // Values
  IDENT: 'IDENT',           // Unquoted identifiers
  INT: 'INT',               // Integer numbers
  FLOAT: 'FLOAT',           // Floating point numbers
  STRING: 'STRING',         // Strings "..."
  TRIPLE_STRING: 'TRIPLE_STRING', // Strings """..."""

  // Typed strings
  D_QUOTED: 'D_QUOTED',     // d"decimal"
  B_QUOTED: 'B_QUOTED',     // b"base64"
  U_QUOTED: 'U_QUOTED',     // u"uuid"
  T_QUOTED: 'T_QUOTED',     // t"datetime"
  R_QUOTED: 'R_QUOTED',     // r"duration"

  // End of input
  EOF: 'EOF',
};

/**
 * Single token
 */
export class Token {
  /**
   * @param {string} kind - Token type (from TokenType)
   * @param {Span} span - Position in source
   * @param {*} value - Extracted value (optional)
   */
  constructor(kind, span, value = null) {
    this.kind = kind;
    this.span = span;
    this.value = value;
  }
}

/**
 * Lexer for xCDN
 */
export class Lexer {
  /**
   * @param {string} source - Source code
   */
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
  }

  /**
   * Creates a Span for the current position
   * @returns {Span}
   */
  span() {
    return new Span(this.pos, this.line, this.column);
  }

  /**
   * Reads the next character without consuming it
   * @returns {string|null}
   */
  peek() {
    if (this.pos >= this.source.length) {
      return null;
    }
    return this.source[this.pos];
  }

  /**
   * Looks at the second character ahead without consuming
   * @returns {string|null}
   */
  peekNext() {
    if (this.pos + 1 >= this.source.length) {
      return null;
    }
    return this.source[this.pos + 1];
  }

  /**
   * Consumes and returns the next character
   * @returns {string|null}
   */
  bump() {
    if (this.pos >= this.source.length) {
      return null;
    }
    const ch = this.source[this.pos];
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  /**
   * Skips whitespace and comments
   */
  skipWsAndComments() {
    while (true) {
      const ch = this.peek();
      if (ch === null) break;

      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.bump();
        continue;
      }

      // Comments
      if (ch === '/') {
        const next = this.peekNext();
        if (next === '/') {
          // Line comment
          this.bump(); // /
          this.bump(); // /
          while (this.peek() !== null && this.peek() !== '\n') {
            this.bump();
          }
          continue;
        } else if (next === '*') {
          // Block comment
          this.bump(); // /
          this.bump(); // *
          while (true) {
            const c = this.bump();
            if (c === null) {
              throw new XCDNError(ErrorKind.Eof, this.span(), 'Unterminated block comment');
            }
            if (c === '*' && this.peek() === '/') {
              this.bump(); // /
              break;
            }
          }
          continue;
        }
      }

      break;
    }
  }

  /**
   * Reads an identifier or keyword
   * @returns {Token}
   */
  readIdent() {
    const startSpan = this.span();
    let value = '';

    while (true) {
      const ch = this.peek();
      if (ch === null) break;
      if (this.isIdentContinue(ch)) {
        value += this.bump();
      } else {
        break;
      }
    }

    // Check keywords
    if (value === 'true') {
      return new Token(TokenType.TRUE, startSpan, true);
    } else if (value === 'false') {
      return new Token(TokenType.FALSE, startSpan, false);
    } else if (value === 'null') {
      return new Token(TokenType.NULL, startSpan, null);
    }

    return new Token(TokenType.IDENT, startSpan, value);
  }

  /**
   * Checks if the character can start an identifier
   * @param {string} ch
   * @returns {boolean}
   */
  isIdentStart(ch) {
    return (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           ch === '_';
  }

  /**
   * Checks if the character can continue an identifier
   * @param {string} ch
   * @returns {boolean}
   */
  isIdentContinue(ch) {
    return this.isIdentStart(ch) ||
           (ch >= '0' && ch <= '9') ||
           ch === '-';
  }

  /**
   * Reads a number (integer or float)
   * @returns {Token}
   */
  readNumber() {
    const startSpan = this.span();
    let value = '';
    let isFloat = false;

    // Optional sign
    if (this.peek() === '+' || this.peek() === '-') {
      value += this.bump();
    }

    // Integer part
    while (this.peek() !== null && this.peek() >= '0' && this.peek() <= '9') {
      value += this.bump();
    }

    // Decimal part
    if (this.peek() === '.' && this.peekNext() >= '0' && this.peekNext() <= '9') {
      isFloat = true;
      value += this.bump(); // .
      while (this.peek() !== null && this.peek() >= '0' && this.peek() <= '9') {
        value += this.bump();
      }
    }

    // Exponent
    if (this.peek() === 'e' || this.peek() === 'E') {
      isFloat = true;
      value += this.bump(); // e/E
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.bump();
      }
      while (this.peek() !== null && this.peek() >= '0' && this.peek() <= '9') {
        value += this.bump();
      }
    }

    if (isFloat) {
      const floatVal = parseFloat(value);
      if (isNaN(floatVal)) {
        throw new XCDNError(ErrorKind.InvalidNumber, startSpan, value);
      }
      return new Token(TokenType.FLOAT, startSpan, floatVal);
    } else {
      // Try BigInt for large numbers
      try {
        const intVal = BigInt(value);
        return new Token(TokenType.INT, startSpan, intVal);
      } catch {
        throw new XCDNError(ErrorKind.InvalidNumber, startSpan, value);
      }
    }
  }

  /**
   * Reads a normal string "..."
   * @returns {string}
   */
  readStringContent() {
    let value = '';

    while (true) {
      const ch = this.bump();
      if (ch === null) {
        throw new XCDNError(ErrorKind.Eof, this.span(), 'Unterminated string');
      }
      if (ch === '"') {
        break;
      }
      if (ch === '\\') {
        const escaped = this.bump();
        if (escaped === null) {
          throw new XCDNError(ErrorKind.Eof, this.span(), 'Unterminated escape sequence');
        }
        switch (escaped) {
          case '"': value += '"'; break;
          case '\\': value += '\\'; break;
          case '/': value += '/'; break;
          case 'b': value += '\b'; break;
          case 'f': value += '\f'; break;
          case 'n': value += '\n'; break;
          case 'r': value += '\r'; break;
          case 't': value += '\t'; break;
          case 'u': {
            // Unicode escape \uXXXX
            let hex = '';
            for (let i = 0; i < 4; i++) {
              const h = this.bump();
              if (h === null || !this.isHexDigit(h)) {
                throw new XCDNError(ErrorKind.InvalidEscape, this.span(), '\\u requires 4 hex digits');
              }
              hex += h;
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          default:
            throw new XCDNError(ErrorKind.InvalidEscape, this.span(), `Unknown escape: \\${escaped}`);
        }
      } else {
        value += ch;
      }
    }

    return value;
  }

  /**
   * Checks if the character is a hexadecimal digit
   * @param {string} ch
   * @returns {boolean}
   */
  isHexDigit(ch) {
    return (ch >= '0' && ch <= '9') ||
           (ch >= 'a' && ch <= 'f') ||
           (ch >= 'A' && ch <= 'F');
  }

  /**
   * Reads a triple string """..."""
   * @returns {string}
   */
  readTripleString() {
    let value = '';

    while (true) {
      const ch = this.bump();
      if (ch === null) {
        throw new XCDNError(ErrorKind.Eof, this.span(), 'Unterminated triple-quoted string');
      }
      if (ch === '"' && this.peek() === '"' && this.peekNext() === '"') {
        this.bump(); // "
        this.bump(); // "
        break;
      }
      value += ch;
    }

    return value;
  }

  /**
   * Reads the next token
   * @returns {Token}
   */
  nextToken() {
    this.skipWsAndComments();

    const startSpan = this.span();
    const ch = this.peek();

    if (ch === null) {
      return new Token(TokenType.EOF, startSpan);
    }

    // Single structural characters
    switch (ch) {
      case '{':
        this.bump();
        return new Token(TokenType.LBRACE, startSpan);
      case '}':
        this.bump();
        return new Token(TokenType.RBRACE, startSpan);
      case '[':
        this.bump();
        return new Token(TokenType.LBRACKET, startSpan);
      case ']':
        this.bump();
        return new Token(TokenType.RBRACKET, startSpan);
      case '(':
        this.bump();
        return new Token(TokenType.LPAREN, startSpan);
      case ')':
        this.bump();
        return new Token(TokenType.RPAREN, startSpan);
      case ':':
        this.bump();
        return new Token(TokenType.COLON, startSpan);
      case ',':
        this.bump();
        return new Token(TokenType.COMMA, startSpan);
      case '$':
        this.bump();
        return new Token(TokenType.DOLLAR, startSpan);
      case '#':
        this.bump();
        return new Token(TokenType.HASH, startSpan);
      case '@':
        this.bump();
        return new Token(TokenType.AT, startSpan);
    }

    // Strings
    if (ch === '"') {
      this.bump(); // opening "

      // Check for triple-quoted string
      if (this.peek() === '"' && this.peekNext() === '"') {
        this.bump(); // "
        this.bump(); // "
        const value = this.readTripleString();
        return new Token(TokenType.TRIPLE_STRING, startSpan, value);
      }

      const value = this.readStringContent();
      return new Token(TokenType.STRING, startSpan, value);
    }

    // Typed strings (d", b", u", t", r")
    if ((ch === 'd' || ch === 'b' || ch === 'u' || ch === 't' || ch === 'r') &&
        this.peekNext() === '"') {
      const prefix = this.bump();
      this.bump(); // "
      const value = this.readStringContent();

      switch (prefix) {
        case 'd': return new Token(TokenType.D_QUOTED, startSpan, value);
        case 'b': return new Token(TokenType.B_QUOTED, startSpan, value);
        case 'u': return new Token(TokenType.U_QUOTED, startSpan, value);
        case 't': return new Token(TokenType.T_QUOTED, startSpan, value);
        case 'r': return new Token(TokenType.R_QUOTED, startSpan, value);
      }
    }

    // Identifiers
    if (this.isIdentStart(ch)) {
      return this.readIdent();
    }

    // Numbers
    if ((ch >= '0' && ch <= '9') ||
        ch === '.' ||
        ch === '+' ||
        ch === '-') {
      // Verify it's a valid number
      if (ch === '.' && !(this.peekNext() >= '0' && this.peekNext() <= '9')) {
        throw new XCDNError(ErrorKind.InvalidToken, startSpan, ch);
      }
      if ((ch === '+' || ch === '-') && !(this.peekNext() >= '0' && this.peekNext() <= '9') && this.peekNext() !== '.') {
        throw new XCDNError(ErrorKind.InvalidToken, startSpan, ch);
      }
      return this.readNumber();
    }

    throw new XCDNError(ErrorKind.InvalidToken, startSpan, ch);
  }
}
