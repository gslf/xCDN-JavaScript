/**
 * xCDN AST Module
 * Data structures for the xCDN format
 */

/**
 * Main xCDN document
 */
export class Document {
  /**
   * @param {Directive[]} prolog - Initial directives ($schema, etc.)
   * @param {Node[]} values - Top-level values
   */
  constructor(prolog = [], values = []) {
    this.prolog = prolog;
    this.values = values;
  }

  /**
   * Dict-like access
   * @param {number|string} key
   */
  get(key) {
    if (typeof key === 'number') {
      return this.values[key];
    }
    // Access the first object
    if (this.values.length > 0 && this.values[0].value instanceof XObject) {
      return this.values[0].value.get(key);
    }
    return undefined;
  }

  /**
   * Set dict-like
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (this.values.length > 0 && this.values[0].value instanceof XObject) {
      this.values[0].value.set(key, value);
    }
  }

  /**
   * Check if key exists
   * @param {string} key
   */
  has(key) {
    if (this.values.length > 0 && this.values[0].value instanceof XObject) {
      return this.values[0].value.has(key);
    }
    return false;
  }

  /**
   * Unwrap to raw JS value (delegates to first value's unwrap for implicit-object documents)
   */
  unwrap() {
    if (this.values.length > 0) {
      return this.values[0].unwrap();
    }
    return undefined;
  }
}

/**
 * Directive ($name: value)
 */
export class Directive {
  /**
   * @param {string} name - Directive name (without $)
   * @param {*} value - Directive value
   */
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}

/**
 * Node decorated with tags and annotations
 */
export class Node {
  /**
   * @param {Tag[]} tags - List of tags (#tag)
   * @param {Annotation[]} annotations - List of annotations (@anno)
   * @param {*} value - Actual value
   */
  constructor(tags = [], annotations = [], value = null) {
    this.tags = tags;
    this.annotations = annotations;
    this.value = value;
  }

  // Dict-like methods delegated to the value
  get(key, defaultValue = undefined) {
    if (this.value && typeof this.value.get === 'function') {
      return this.value.get(key, defaultValue);
    }
    return defaultValue;
  }

  set(key, value) {
    if (this.value && typeof this.value.set === 'function') {
      this.value.set(key, value);
    }
  }

  has(key) {
    if (this.value && typeof this.value.has === 'function') {
      return this.value.has(key);
    }
    return false;
  }

  keys() {
    if (this.value instanceof XObject) {
      return this.value.keys();
    }
    return [];
  }

  valuesIter() {
    if (this.value instanceof XObject) {
      return this.value.valuesIter();
    }
    return [];
  }

  items() {
    if (this.value instanceof XObject) {
      return this.value.items();
    }
    return [];
  }

  append(value) {
    if (this.value instanceof XArray) {
      this.value.append(value);
    }
  }

  get length() {
    if (this.value && typeof this.value.length !== 'undefined') {
      return this.value.length;
    }
    return 0;
  }

  [Symbol.iterator]() {
    if (this.value && typeof this.value[Symbol.iterator] === 'function') {
      return this.value[Symbol.iterator]();
    }
    return [][Symbol.iterator]();
  }

  /**
   * Unwrap to raw JS value (delegates to this.value.unwrap())
   */
  unwrap() {
    if (this.value && typeof this.value.unwrap === 'function') {
      return this.value.unwrap();
    }
    return this.value;
  }
}

/**
 * Tag (#tag)
 */
export class Tag {
  /**
   * @param {string} name - Tag name
   */
  constructor(name) {
    this.name = name;
  }
}

/**
 * Annotation (@name(args...))
 */
export class Annotation {
  /**
   * @param {string} name - Annotation name
   * @param {*[]} args - Optional arguments
   */
  constructor(name, args = []) {
    this.name = name;
    this.args = args;
  }
}

// ============== VALUE TYPES ==============

/**
 * Base class for value types
 */
export class ValueType {
  constructor() {
    if (new.target === ValueType) {
      throw new Error('ValueType is abstract');
    }
  }
}

/**
 * Null value
 */
export class Null extends ValueType {
  constructor() {
    super();
  }

  unwrap() {
    return null;
  }
}

/**
 * Boolean value
 */
export class Bool extends ValueType {
  /**
   * @param {boolean} value
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * Integer value
 */
export class Int extends ValueType {
  /**
   * @param {number|bigint} value
   */
  constructor(value) {
    super();
    this.value = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
  }

  unwrap() {
    return this.value;
  }
}

/**
 * Float value
 */
export class Float extends ValueType {
  /**
   * @param {number} value
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * Decimal value (d"...")
 */
export class DecimalValue extends ValueType {
  /**
   * @param {string} value - String representation of the decimal
   */
  constructor(value) {
    super();
    this.value = value; // Keep as string for precision
  }

  unwrap() {
    return this.value;
  }
}

/**
 * String value
 */
export class XString extends ValueType {
  /**
   * @param {string} value
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * Bytes value (b"..." base64)
 */
export class Bytes extends ValueType {
  /**
   * @param {Uint8Array} value - Decoded bytes
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * Datetime value (t"...")
 */
export class DateTime extends ValueType {
  /**
   * @param {Date} value
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * Duration value (r"...")
 */
export class Duration extends ValueType {
  /**
   * @param {string} value - ISO8601 duration as string
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * UUID value (u"...")
 */
export class Uuid extends ValueType {
  /**
   * @param {string} value - UUID as string
   */
  constructor(value) {
    super();
    this.value = value;
  }

  unwrap() {
    return this.value;
  }
}

/**
 * xCDN Array
 */
export class XArray extends ValueType {
  /**
   * @param {Node[]} value - List of nodes
   */
  constructor(value = []) {
    super();
    this.value = value;
  }

  get(index) {
    return this.value[index];
  }

  set(index, val) {
    this.value[index] = val;
  }

  get length() {
    return this.value.length;
  }

  append(val) {
    // Wrap in Node if not already
    if (val instanceof Node) {
      this.value.push(val);
    } else {
      this.value.push(new Node([], [], val));
    }
  }

  unwrap() {
    return this.value.map(node => node.unwrap());
  }

  [Symbol.iterator]() {
    return this.value[Symbol.iterator]();
  }
}

/**
 * xCDN Object
 */
export class XObject extends ValueType {
  /**
   * @param {Map<string, Node>|Object} value - Key-value map
   */
  constructor(value = new Map()) {
    super();
    if (value instanceof Map) {
      this.value = value;
    } else {
      this.value = new Map(Object.entries(value));
    }
  }

  get(key, defaultValue = undefined) {
    return this.value.has(key) ? this.value.get(key) : defaultValue;
  }

  set(key, val) {
    // Wrap in Node if not already
    if (val instanceof Node) {
      this.value.set(key, val);
    } else {
      this.value.set(key, new Node([], [], val));
    }
  }

  has(key) {
    return this.value.has(key);
  }

  get length() {
    return this.value.size;
  }

  keys() {
    return Array.from(this.value.keys());
  }

  valuesIter() {
    return Array.from(this.value.values());
  }

  items() {
    return Array.from(this.value.entries());
  }

  unwrap() {
    const result = {};
    for (const [key, node] of this.value.entries()) {
      result[key] = node.unwrap();
    }
    return result;
  }

  [Symbol.iterator]() {
    return this.value.keys()[Symbol.iterator]();
  }
}

// Export aliases for compatibility
export { XString as String };
export { XArray as Array };
export { XObject as Object };
