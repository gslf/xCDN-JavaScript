/**
 * xCDN Serializer Module
 * Serialization for the xCDN format
 */

import {
  Document, Directive, Node, Tag, Annotation,
  Null, Bool, Int, Float, DecimalValue, XString, Bytes,
  DateTime, Duration, Uuid, XArray, XObject
} from './ast.js';

/**
 * Serialization format
 */
export class Format {
  /**
   * @param {boolean} pretty - Pretty-print with indentation
   * @param {number} indent - Spaces per indentation level
   * @param {boolean} trailingCommas - Trailing commas
   */
  constructor(pretty = true, indent = 2, trailingCommas = true) {
    this.pretty = pretty;
    this.indent = indent;
    this.trailingCommas = trailingCommas;
  }
}

/**
 * xCDN Serializer
 */
export class Serializer {
  /**
   * @param {Format} format
   */
  constructor(format = new Format()) {
    this.format = format;
    this.output = '';
    this.depth = 0;
  }

  /**
   * Writes a string to the output
   * @param {string} str
   */
  write(str) {
    this.output += str;
  }

  /**
   * Writes a newline (if pretty)
   */
  newline() {
    if (this.format.pretty) {
      this.write('\n');
    }
  }

  /**
   * Writes the current indentation (if pretty)
   */
  writeIndent() {
    if (this.format.pretty) {
      this.write(' '.repeat(this.depth * this.format.indent));
    }
  }

  /**
   * Checks if a string is a simple identifier
   * @param {string} str
   * @returns {boolean}
   */
  isSimpleIdent(str) {
    if (!str || str.length === 0) return false;

    const first = str[0];
    if (!((first >= 'a' && first <= 'z') ||
          (first >= 'A' && first <= 'Z') ||
          first === '_')) {
      return false;
    }

    for (let i = 1; i < str.length; i++) {
      const ch = str[i];
      if (!((ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z') ||
            (ch >= '0' && ch <= '9') ||
            ch === '_' ||
            ch === '-')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Escapes a string
   * @param {string} str
   * @returns {string}
   */
  escapeString(str) {
    let result = '';
    for (const ch of str) {
      switch (ch) {
        case '"': result += '\\"'; break;
        case '\\': result += '\\\\'; break;
        case '\b': result += '\\b'; break;
        case '\f': result += '\\f'; break;
        case '\n': result += '\\n'; break;
        case '\r': result += '\\r'; break;
        case '\t': result += '\\t'; break;
        default:
          const code = ch.charCodeAt(0);
          if (code < 0x20) {
            // Control character
            result += '\\u' + code.toString(16).padStart(4, '0');
          } else {
            result += ch;
          }
      }
    }
    return result;
  }

  /**
   * Encode bytes in base64
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  encodeBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Formats datetime to RFC3339
   * @param {Date} date
   * @returns {string}
   */
  formatDateTime(date) {
    return date.toISOString();
  }

  /**
   * Serializes a document
   * @param {Document} doc
   * @returns {string}
   */
  serialize(doc) {
    // Prolog
    for (const directive of doc.prolog) {
      this.serializeDirective(directive);
    }

    // Values
    for (let i = 0; i < doc.values.length; i++) {
      const node = doc.values[i];
      this.serializeNode(node, true);
      if (i < doc.values.length - 1) {
        this.newline();
      }
    }

    return this.output;
  }

  /**
   * Serializes a directive
   * @param {Directive} directive
   */
  serializeDirective(directive) {
    this.write('$');
    this.write(directive.name);
    this.write(':');
    if (this.format.pretty) this.write(' ');
    this.serializeNode(directive.value, false);
    if (this.format.trailingCommas) {
      this.write(',');
    }
    this.newline();
  }

  /**
   * Serializes a node
   * @param {Node} node
   * @param {boolean} isTopLevel
   */
  serializeNode(node, isTopLevel = false) {
    // Annotations
    for (const anno of node.annotations) {
      this.write('@');
      this.write(anno.name);
      if (anno.args.length > 0) {
        this.write('(');
        for (let i = 0; i < anno.args.length; i++) {
          this.serializeValue(anno.args[i]);
          if (i < anno.args.length - 1) {
            this.write(', ');
          }
        }
        this.write(')');
      }
      this.write(' ');
    }

    // Tags
    for (const tag of node.tags) {
      this.write('#');
      this.write(tag.name);
      this.write(' ');
    }

    // Value
    this.serializeValue(node.value);
  }

  /**
   * Serializes a value
   * @param {*} value
   */
  serializeValue(value) {
    if (value instanceof Null) {
      this.write('null');
    } else if (value instanceof Bool) {
      this.write(value.value ? 'true' : 'false');
    } else if (value instanceof Int) {
      this.write(value.value.toString());
    } else if (value instanceof Float) {
      this.write(value.value.toString());
    } else if (value instanceof DecimalValue) {
      this.write('d"');
      this.write(value.value);
      this.write('"');
    } else if (value instanceof XString) {
      this.write('"');
      this.write(this.escapeString(value.value));
      this.write('"');
    } else if (value instanceof Bytes) {
      this.write('b"');
      this.write(this.encodeBase64(value.value));
      this.write('"');
    } else if (value instanceof DateTime) {
      this.write('t"');
      this.write(this.formatDateTime(value.value));
      this.write('"');
    } else if (value instanceof Duration) {
      this.write('r"');
      this.write(value.value);
      this.write('"');
    } else if (value instanceof Uuid) {
      this.write('u"');
      this.write(value.value);
      this.write('"');
    } else if (value instanceof XArray) {
      this.serializeArray(value);
    } else if (value instanceof XObject) {
      this.serializeObject(value);
    } else {
      throw new Error(`Unknown value type: ${value?.constructor?.name}`);
    }
  }

  /**
   * Serializes an array
   * @param {XArray} arr
   */
  serializeArray(arr) {
    this.write('[');

    if (arr.value.length > 0) {
      if (this.format.pretty) {
        this.newline();
        this.depth++;
      }

      for (let i = 0; i < arr.value.length; i++) {
        if (this.format.pretty) {
          this.writeIndent();
        }
        this.serializeNode(arr.value[i]);

        if (i < arr.value.length - 1) {
          this.write(',');
        } else if (this.format.trailingCommas) {
          this.write(',');
        }

        if (this.format.pretty) {
          this.newline();
        }
      }

      if (this.format.pretty) {
        this.depth--;
        this.writeIndent();
      }
    }

    this.write(']');
  }

  /**
   * Serializes an object
   * @param {XObject} obj
   */
  serializeObject(obj) {
    this.write('{');

    const entries = Array.from(obj.value.entries());

    if (entries.length > 0) {
      if (this.format.pretty) {
        this.newline();
        this.depth++;
      }

      for (let i = 0; i < entries.length; i++) {
        const [key, node] = entries[i];

        if (this.format.pretty) {
          this.writeIndent();
        }

        // Key
        if (this.isSimpleIdent(key)) {
          this.write(key);
        } else {
          this.write('"');
          this.write(this.escapeString(key));
          this.write('"');
        }

        this.write(':');
        if (this.format.pretty) this.write(' ');

        // Value
        this.serializeNode(node);

        if (i < entries.length - 1) {
          this.write(',');
        } else if (this.format.trailingCommas) {
          this.write(',');
        }

        if (this.format.pretty) {
          this.newline();
        }
      }

      if (this.format.pretty) {
        this.depth--;
        this.writeIndent();
      }
    }

    this.write('}');
  }
}

/**
 * Serializes a document in pretty format
 * @param {Document} doc
 * @returns {string}
 */
export function toStringPretty(doc) {
  const serializer = new Serializer(new Format(true, 2, true));
  return serializer.serialize(doc);
}

/**
 * Serializes a document in compact format
 * @param {Document} doc
 * @returns {string}
 */
export function toStringCompact(doc) {
  const serializer = new Serializer(new Format(false, 0, false));
  return serializer.serialize(doc);
}

/**
 * Serializes a document with custom format
 * @param {Document} doc
 * @param {Format} format
 * @returns {string}
 */
export function toStringWithFormat(doc, format) {
  const serializer = new Serializer(format);
  return serializer.serialize(doc);
}
