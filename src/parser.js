/**
 * xCDN Parser Module
 * Recursive descent parser for the xCDN format
 */

import { Lexer, TokenType, Token } from './lexer.js';
import { XCDNError, ErrorKind } from './error.js';
import {
  Document, Directive, Node, Tag, Annotation,
  Null, Bool, Int, Float, DecimalValue, XString, Bytes,
  DateTime, Duration, Uuid, XArray, XObject
} from './ast.js';

/**
 * Decode Base64 (standard or URL-safe)
 * @param {string} str
 * @returns {Uint8Array}
 */
function decodeBase64(str) {
  try {
    // Try standard base64
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    // Try URL-safe base64
    try {
      const urlSafe = str.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = urlSafe + '='.repeat((4 - urlSafe.length % 4) % 4);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      throw new Error(`Invalid base64: ${str}`);
    }
  }
}

/**
 * Validates and parses UUID
 * @param {string} str
 * @returns {string}
 */
function parseUuid(str) {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(str)) {
    throw new Error(`Invalid UUID: ${str}`);
  }
  return str.toLowerCase();
}

/**
 * Parses RFC3339 datetime
 * @param {string} str
 * @returns {Date}
 */
function parseDateTime(str) {
  // Replace Z with +00:00 for compatibility
  const normalized = str.replace('Z', '+00:00');
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${str}`);
  }
  return date;
}

/**
 * xCDN Parser
 */
export class Parser {
  /**
   * @param {string} source - Source code
   */
  constructor(source) {
    this.lexer = new Lexer(source);
    this.current = this.lexer.nextToken();
  }

  /**
   * Returns the current token without consuming it
   * @returns {Token}
   */
  peek() {
    return this.current;
  }

  /**
   * Consumes and returns the current token
   * @returns {Token}
   */
  bump() {
    const token = this.current;
    this.current = this.lexer.nextToken();
    return token;
  }

  /**
   * Verifies and consumes a specific token
   * @param {string} kind - Expected type
   * @returns {Token}
   */
  expect(kind) {
    const token = this.peek();
    if (token.kind !== kind) {
      throw new XCDNError(
        ErrorKind.Expected,
        token.span,
        `Expected ${kind}, found ${token.kind}`
      );
    }
    return this.bump();
  }

  /**
   * Parses an identifier (IDENT or STRING)
   * @returns {string}
   */
  parseIdentString() {
    const token = this.peek();
    if (token.kind === TokenType.IDENT) {
      this.bump();
      return token.value;
    } else if (token.kind === TokenType.STRING) {
      this.bump();
      return token.value;
    } else {
      throw new XCDNError(
        ErrorKind.Expected,
        token.span,
        `Expected identifier or string, found ${token.kind}`
      );
    }
  }

  /**
   * Parses a key (for objects)
   * @returns {string}
   */
  parseKey() {
    return this.parseIdentString();
  }

  /**
   * Parses the complete document
   * @returns {Document}
   */
  parseDocument() {
    const prolog = [];
    const values = [];

    // Parse prolog directives ($name: value)
    while (this.peek().kind === TokenType.DOLLAR) {
      this.bump(); // $
      const name = this.parseIdentString();
      this.expect(TokenType.COLON);
      const value = this.parseNode();
      prolog.push(new Directive(name, value));
      if (this.peek().kind === TokenType.COMMA) {
        this.bump();
      }
    }

    // Detect implicit object vs stream
    if (this.peek().kind !== TokenType.EOF) {
      const isImplicitObject = this.isImplicitObject();

      if (isImplicitObject) {
        // Parse implicit object
        const objMap = new Map();
        while (this.peek().kind !== TokenType.EOF) {
          const key = this.parseKey();
          this.expect(TokenType.COLON);
          const node = this.parseNode();
          objMap.set(key, node);
          if (this.peek().kind === TokenType.COMMA) {
            this.bump();
          }
        }
        values.push(new Node([], [], new XObject(objMap)));
      } else {
        // Parse stream of values
        while (this.peek().kind !== TokenType.EOF) {
          const node = this.parseNode();
          values.push(node);
        }
      }
    }

    return new Document(prolog, values);
  }

  /**
   * Determines if the top-level is an implicit object
   * @returns {boolean}
   */
  isImplicitObject() {
    // If the next token is IDENT or STRING, check if it's followed by COLON
    const token = this.peek();
    if (token.kind === TokenType.IDENT || token.kind === TokenType.STRING) {
      // Save state
      const savedPos = this.lexer.pos;
      const savedLine = this.lexer.line;
      const savedColumn = this.lexer.column;
      const savedCurrent = this.current;

      // Consume and check
      this.bump();
      const next = this.peek();
      const isObject = next.kind === TokenType.COLON;

      // Restore state
      this.lexer.pos = savedPos;
      this.lexer.line = savedLine;
      this.lexer.column = savedColumn;
      this.current = savedCurrent;

      return isObject;
    }
    return false;
  }

  /**
   * Parses a node (with decorations)
   * @returns {Node}
   */
  parseNode() {
    const tags = [];
    const annotations = [];

    // Parse decorations
    while (true) {
      if (this.peek().kind === TokenType.AT) {
        this.bump(); // @
        const name = this.parseIdentString();
        const args = [];
        if (this.peek().kind === TokenType.LPAREN) {
          this.bump(); // (
          if (this.peek().kind !== TokenType.RPAREN) {
            while (true) {
              const val = this.parseValue();
              args.push(val);
              if (this.peek().kind === TokenType.COMMA) {
                this.bump();
              } else if (this.peek().kind === TokenType.RPAREN) {
                break;
              } else {
                throw new XCDNError(
                  ErrorKind.Expected,
                  this.peek().span,
                  `Expected , or ), found ${this.peek().kind}`
                );
              }
            }
          }
          this.expect(TokenType.RPAREN);
        }
        annotations.push(new Annotation(name, args));
      } else if (this.peek().kind === TokenType.HASH) {
        this.bump(); // #
        const name = this.parseIdentString();
        tags.push(new Tag(name));
      } else {
        break;
      }
    }

    const value = this.parseValue();
    return new Node(tags, annotations, value);
  }

  /**
   * Parses a value
   * @returns {*}
   */
  parseValue() {
    const token = this.peek();

    switch (token.kind) {
      case TokenType.LBRACE:
        return this.parseObject();

      case TokenType.LBRACKET:
        return this.parseArray();

      case TokenType.STRING:
      case TokenType.TRIPLE_STRING:
        this.bump();
        return new XString(token.value);

      case TokenType.TRUE:
        this.bump();
        return new Bool(true);

      case TokenType.FALSE:
        this.bump();
        return new Bool(false);

      case TokenType.NULL:
        this.bump();
        return new Null();

      case TokenType.INT:
        this.bump();
        return new Int(token.value);

      case TokenType.FLOAT:
        this.bump();
        return new Float(token.value);

      case TokenType.D_QUOTED:
        this.bump();
        return new DecimalValue(token.value);

      case TokenType.B_QUOTED:
        this.bump();
        try {
          const bytes = decodeBase64(token.value);
          return new Bytes(bytes);
        } catch (e) {
          throw new XCDNError(ErrorKind.InvalidBase64, token.span, token.value);
        }

      case TokenType.U_QUOTED:
        this.bump();
        try {
          const uuid = parseUuid(token.value);
          return new Uuid(uuid);
        } catch (e) {
          throw new XCDNError(ErrorKind.InvalidUuid, token.span, token.value);
        }

      case TokenType.T_QUOTED:
        this.bump();
        try {
          const dt = parseDateTime(token.value);
          return new DateTime(dt);
        } catch (e) {
          throw new XCDNError(ErrorKind.InvalidDateTime, token.span, token.value);
        }

      case TokenType.R_QUOTED:
        this.bump();
        return new Duration(token.value);

      case TokenType.EOF:
        throw new XCDNError(ErrorKind.Eof, token.span, 'Unexpected end of input');

      default:
        throw new XCDNError(
          ErrorKind.InvalidToken,
          token.span,
          `Unexpected token: ${token.kind}`
        );
    }
  }

  /**
   * Parses an object {key: value, ...}
   * @returns {XObject}
   */
  parseObject() {
    this.expect(TokenType.LBRACE);
    const objMap = new Map();

    while (this.peek().kind !== TokenType.RBRACE) {
      const key = this.parseKey();
      this.expect(TokenType.COLON);
      const node = this.parseNode();
      objMap.set(key, node);

      if (this.peek().kind === TokenType.COMMA) {
        this.bump();
      }
    }

    this.expect(TokenType.RBRACE);
    return new XObject(objMap);
  }

  /**
   * Parses an array [item, ...]
   * @returns {XArray}
   */
  parseArray() {
    this.expect(TokenType.LBRACKET);
    const items = [];

    while (this.peek().kind !== TokenType.RBRACKET) {
      const node = this.parseNode();
      items.push(node);

      if (this.peek().kind === TokenType.COMMA) {
        this.bump();
      }
    }

    this.expect(TokenType.RBRACKET);
    return new XArray(items);
  }
}

/**
 * Parses an xCDN string
 * @param {string} source - Source code
 * @returns {Document}
 */
export function parseStr(source) {
  const parser = new Parser(source);
  return parser.parseDocument();
}

/**
 * Parses from a reader (Python compatibility)
 * @param {{read: () => string}} reader
 * @returns {Document}
 */
export function parseReader(reader) {
  const source = reader.read();
  return parseStr(source);
}
