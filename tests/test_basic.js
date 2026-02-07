/**
 * Basic Tests for xCDN
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { parseStr, toStringPretty, toStringCompact } from '../src/index.js';
import {
  Document, Node, XObject, XArray, XString, Int, Float,
  Bool, Null, DateTime, Duration, Uuid, DecimalValue, Bytes
} from '../src/ast.js';

test('parse null', () => {
  const doc = parseStr('value: null');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Null);
});

test('parse true', () => {
  const doc = parseStr('value: true');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Bool);
  assert.strictEqual(root.get('value').value.value, true);
});

test('parse false', () => {
  const doc = parseStr('value: false');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Bool);
  assert.strictEqual(root.get('value').value.value, false);
});

test('parse integer', () => {
  const doc = parseStr('value: 42');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Int);
  assert.strictEqual(root.get('value').value.value, 42n);
});

test('parse negative integer', () => {
  const doc = parseStr('value: -123');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Int);
  assert.strictEqual(root.get('value').value.value, -123n);
});

test('parse float', () => {
  const doc = parseStr('value: 3.14');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Float);
  assert.strictEqual(root.get('value').value.value, 3.14);
});

test('parse scientific notation', () => {
  const doc = parseStr('value: 1.5e-10');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Float);
  assert.strictEqual(root.get('value').value.value, 1.5e-10);
});

test('parse string', () => {
  const doc = parseStr('value: "hello world"');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof XString);
  assert.strictEqual(root.get('value').value.value, 'hello world');
});

test('parse string with escapes', () => {
  const doc = parseStr('value: "line1\\nline2\\ttab"');
  const root = doc.values[0].value;
  assert.strictEqual(root.get('value').value.value, 'line1\nline2\ttab');
});

test('parse triple-quoted string', () => {
  const doc = parseStr('value: """multi\nline\nstring"""');
  const root = doc.values[0].value;
  assert.strictEqual(root.get('value').value.value, 'multi\nline\nstring');
});

test('parse decimal', () => {
  const doc = parseStr('value: d"19.99"');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof DecimalValue);
  assert.strictEqual(root.get('value').value.value, '19.99');
});

test('parse bytes', () => {
  const doc = parseStr('value: b"SGVsbG8="');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Bytes);
  const decoded = new TextDecoder().decode(root.get('value').value.value);
  assert.strictEqual(decoded, 'Hello');
});

test('parse uuid', () => {
  const doc = parseStr('value: u"550e8400-e29b-41d4-a716-446655440000"');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Uuid);
  assert.strictEqual(root.get('value').value.value, '550e8400-e29b-41d4-a716-446655440000');
});

test('parse datetime', () => {
  const doc = parseStr('value: t"2025-01-15T10:30:00Z"');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof DateTime);
  assert.ok(root.get('value').value.value instanceof Date);
});

test('parse duration', () => {
  const doc = parseStr('value: r"PT30S"');
  const root = doc.values[0].value;
  assert.ok(root.get('value').value instanceof Duration);
  assert.strictEqual(root.get('value').value.value, 'PT30S');
});

test('parse array', () => {
  const doc = parseStr('value: [1, 2, 3]');
  const root = doc.values[0].value;
  const arr = root.get('value').value;
  assert.ok(arr instanceof XArray);
  assert.strictEqual(arr.length, 3);
  assert.strictEqual(arr.get(0).value.value, 1n);
  assert.strictEqual(arr.get(1).value.value, 2n);
  assert.strictEqual(arr.get(2).value.value, 3n);
});

test('parse object', () => {
  const doc = parseStr('value: {a: 1, b: 2}');
  const root = doc.values[0].value;
  const obj = root.get('value').value;
  assert.ok(obj instanceof XObject);
  assert.strictEqual(obj.get('a').value.value, 1n);
  assert.strictEqual(obj.get('b').value.value, 2n);
});

test('parse nested structures', () => {
  const doc = parseStr(`
    users: [
      {name: "Alice", age: 30},
      {name: "Bob", age: 25},
    ]
  `);
  const root = doc.values[0].value;
  const users = root.get('users').value;
  assert.strictEqual(users.length, 2);
  assert.strictEqual(users.get(0).value.get('name').value.value, 'Alice');
  assert.strictEqual(users.get(1).value.get('name').value.value, 'Bob');
});

test('parse tags', () => {
  const doc = parseStr('value: #important #urgent "task"');
  const root = doc.values[0].value;
  const node = root.get('value');
  assert.strictEqual(node.tags.length, 2);
  assert.strictEqual(node.tags[0].name, 'important');
  assert.strictEqual(node.tags[1].name, 'urgent');
});

test('parse annotations', () => {
  const doc = parseStr('value: @mime("image/png") @size(100, 200) "data"');
  const root = doc.values[0].value;
  const node = root.get('value');
  assert.strictEqual(node.annotations.length, 2);
  assert.strictEqual(node.annotations[0].name, 'mime');
  assert.strictEqual(node.annotations[0].args[0].value, 'image/png');
  assert.strictEqual(node.annotations[1].name, 'size');
  assert.strictEqual(node.annotations[1].args[0].value, 100n);
  assert.strictEqual(node.annotations[1].args[1].value, 200n);
});

test('parse prolog directive', () => {
  const doc = parseStr('$schema: "https://example.com/schema.json", key: "value"');
  assert.strictEqual(doc.prolog.length, 1);
  assert.strictEqual(doc.prolog[0].name, 'schema');
  assert.strictEqual(doc.prolog[0].value.value.value, 'https://example.com/schema.json');
});

test('parse line comments', () => {
  const doc = parseStr(`
    // This is a comment
    key: "value" // inline comment
  `);
  const root = doc.values[0].value;
  assert.strictEqual(root.get('key').value.value, 'value');
});

test('parse block comments', () => {
  const doc = parseStr(`
    /* Block comment */
    key: /* inline */ "value"
  `);
  const root = doc.values[0].value;
  assert.strictEqual(root.get('key').value.value, 'value');
});

test('roundtrip', () => {
  const source = 'name: "test", value: 42, active: true';
  const doc = parseStr(source);
  const output = toStringCompact(doc);
  const reparsed = parseStr(output);
  assert.strictEqual(reparsed.values[0].value.get('name').value.value, 'test');
  assert.strictEqual(reparsed.values[0].value.get('value').value.value, 42n);
  assert.strictEqual(reparsed.values[0].value.get('active').value.value, true);
});

test('trailing commas', () => {
  const doc = parseStr(`
    arr: [1, 2, 3,],
    obj: {a: 1, b: 2,},
  `);
  const root = doc.values[0].value;
  assert.strictEqual(root.get('arr').value.length, 3);
  assert.strictEqual(root.get('obj').value.length, 2);
});

test('quoted keys', () => {
  const doc = parseStr('{"key with spaces": "value", "123": "numeric key"}');
  const root = doc.values[0].value;
  assert.strictEqual(root.get('key with spaces').value.value, 'value');
  assert.strictEqual(root.get('123').value.value, 'numeric key');
});

test('unicode escape', () => {
  const doc = parseStr('value: "hello\\u0020world"');
  const root = doc.values[0].value;
  assert.strictEqual(root.get('value').value.value, 'hello world');
});

test('empty array', () => {
  const doc = parseStr('value: []');
  const root = doc.values[0].value;
  assert.strictEqual(root.get('value').value.length, 0);
});

test('empty object', () => {
  const doc = parseStr('value: {}');
  const root = doc.values[0].value;
  assert.strictEqual(root.get('value').value.length, 0);
});
