/**
 * Fields Access Example
 * Demonstrates field access in xCDN documents
 */

import { parseStr } from '../src/index.js';
import {
  XObject, XArray, XString, Int, Float, Bool, Null,
  DateTime, Duration, Uuid, DecimalValue, Bytes
} from '../src/ast.js';

const source = `
name: "Test Document",
version: 1,
pi: 3.14159,
enabled: true,
nothing: null,

// Special types
timestamp: t"2025-06-15T14:30:00Z",
duration: r"P1DT2H30M",
uuid: u"123e4567-e89b-12d3-a456-426614174000",
price: d"99.99",
data: b"SGVsbG8gV29ybGQh",

// Nested structures
config: {
  debug: false,
  max_retries: 3,
  endpoints: [
    "https://api1.example.com",
    "https://api2.example.com",
  ],
},

// Arrays with decorations
items: [
  #featured @priority(1) "First item",
  #normal @priority(2) "Second item",
  #deprecated @priority(99) "Old item",
],
`;

const doc = parseStr(source);

console.log('=== Accessing String Values ===');
console.log('name:', doc.get('name').unwrap());
console.log('name type:', doc.get('name').value.constructor.name);

console.log('\n=== Accessing Numeric Values ===');
console.log('version:', doc.get('version').unwrap());
console.log('version type:', doc.get('version').value.constructor.name);

console.log('pi:', doc.get('pi').unwrap());
console.log('pi type:', doc.get('pi').value.constructor.name);

console.log('\n=== Accessing Boolean and Null ===');
console.log('enabled:', doc.get('enabled').unwrap());
console.log('enabled is Bool:', doc.get('enabled').value instanceof Bool);

console.log('nothing is Null:', doc.get('nothing').value instanceof Null);

console.log('\n=== Accessing Special Types ===');

console.log('timestamp:', doc.get('timestamp').unwrap());
console.log('timestamp is Date:', doc.get('timestamp').unwrap() instanceof Date);

console.log('duration:', doc.get('duration').unwrap());
console.log('duration type:', doc.get('duration').value.constructor.name);

console.log('uuid:', doc.get('uuid').unwrap());

console.log('price:', doc.get('price').unwrap());
console.log('price type:', doc.get('price').value.constructor.name);

console.log('data (bytes):', new TextDecoder().decode(doc.get('data').unwrap()));

console.log('\n=== Accessing Nested Objects ===');
console.log('config.debug:', doc.get('config').get('debug').unwrap());
console.log('config.max_retries:', doc.get('config').get('max_retries').unwrap());

const endpoints = doc.get('config').get('endpoints');
console.log('config.endpoints:');
for (const endpoint of endpoints) {
  console.log('  -', endpoint.unwrap());
}

console.log('\n=== Accessing Tags and Annotations ===');
const items = doc.get('items');

// Each element in the array is a Node with .tags and .annotations
const first = items.get(0);

// Tags — array of Tag objects
console.log('First item tags:', first.tags.length);
console.log('First tag name:', first.tags[0].name);        // "featured"

// Annotations — array of Annotation objects
console.log('First item annotations:', first.annotations.length);
console.log('First annotation name:', first.annotations[0].name);  // "priority"
console.log('First annotation args:', first.annotations[0].args.map(a => a.value));  // [1n]

// Iterate all decorated items
console.log('\nAll decorated items:');
for (const item of items) {
  const tags = item.tags.map(t => `#${t.name}`).join(' ');
  const annos = item.annotations.map(a => {
    if (a.args.length > 0) {
      return `@${a.name}(${a.args.map(arg => arg.value).join(', ')})`;
    }
    return `@${a.name}`;
  }).join(' ');

  console.log(`  ${tags} ${annos} "${item.unwrap()}"`);
}

console.log('\n=== Dict-like Operations ===');
console.log('has "name":', doc.has('name'));
console.log('has "nonexistent":', doc.has('nonexistent'));
console.log('keys:', doc.get(0).keys());
console.log('length:', doc.get(0).length);

console.log('\n=== Iteration ===');
console.log('Iterating over root keys:');
for (const key of doc.get(0)) {
  console.log('  -', key);
}
