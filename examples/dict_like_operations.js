/**
 * Dict-like Operations Example
 * Demonstrates dictionary-like operations on xCDN objects
 */

import { parseStr, toStringPretty } from '../src/index.js';
import {
  Document, Node, XObject, XArray, XString, Int, Bool
} from '../src/ast.js';

console.log('=== Creating a Document Programmatically ===');

// Create an object programmatically
const obj = new XObject();
obj.set('name', new XString('Programmatic Document'));
obj.set('version', new Int(1));
obj.set('active', new Bool(true));

// Create an array
const tags = new XArray();
tags.append(new XString('tag1'));
tags.append(new XString('tag2'));
tags.append(new XString('tag3'));
obj.set('tags', tags);

// Create a nested object
const config = new XObject();
config.set('debug', new Bool(false));
config.set('timeout', new Int(30));
obj.set('config', config);

// Wrap in Document
const doc = new Document([], [new Node([], [], obj)]);

console.log('Created document:');
console.log(toStringPretty(doc));

console.log('\n=== Modifying Parsed Documents ===');

const source = `
items: [
  "item1",
  "item2",
],
count: 2,
`;

const parsed = parseStr(source);

console.log('Original:');
console.log(toStringPretty(parsed));

// Add a new element to the array
const items = parsed.get('items');
items.append(new XString('item3'));

// Modify the counter
parsed.set('count', new Int(3));

// Add a new field
parsed.set('modified', new Bool(true));

console.log('After modifications:');
console.log(toStringPretty(parsed));

console.log('\n=== Dict-like Access Patterns ===');

const doc2 = parseStr(`
user: {
  profile: {
    name: "Alice",
    settings: {
      theme: "dark",
      lang: "en",
    },
  },
},
`);

// Nested access using chained get()
console.log('User profile name:', doc2.get('user').get('profile').get('name').unwrap());
console.log('Theme setting:', doc2.get('user').get('profile').get('settings').get('theme').unwrap());

// Check key existence
console.log('\nChecking keys:');
console.log('profile has "name":', doc2.get('user').get('profile').has('name'));
console.log('profile has "email":', doc2.get('user').get('profile').has('email'));

// Iteration
console.log('\nIterating over settings:');
const settings = doc2.get('user').get('profile').get('settings');
for (const [key, node] of settings.items()) {
  console.log(`  ${key}: ${node.unwrap()}`);
}

console.log('\n=== Array Operations ===');

const arrDoc = parseStr(`
numbers: [1, 2, 3, 4, 5],
`);

const numbers = arrDoc.get('numbers');

console.log('Array length:', numbers.length);
console.log('First element:', numbers.get(0).unwrap());
console.log('Last element:', numbers.get(numbers.length - 1).unwrap());

console.log('\nIterating:');
let sum = 0n;
for (const node of numbers) {
  const val = node.unwrap();
  console.log('  -', val.toString());
  sum += val;
}
console.log('Sum:', sum.toString());

// Append
numbers.append(new Int(6));
console.log('\nAfter append:');
console.log(toStringPretty(arrDoc));

console.log('\n=== Using Document get/set ===');

const implicitDoc = parseStr(`
key1: "value1",
key2: "value2",
`);

// Document-level access
console.log('doc.get("key1"):', implicitDoc.get('key1').unwrap());
console.log('doc.has("key1"):', implicitDoc.has('key1'));
console.log('doc.has("key3"):', implicitDoc.has('key3'));

// Set through document
implicitDoc.set('key3', new XString('value3'));
console.log('\nAfter setting key3:');
console.log(toStringPretty(implicitDoc));
