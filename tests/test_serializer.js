/**
 * Serializer Tests for xCDN
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { parseStr, toStringPretty, toStringCompact, toStringWithFormat, Format } from '../src/index.js';
import {
  Document, Directive, Node, Tag, Annotation,
  XObject, XArray, XString, Int, Float, Bool, Null,
  DateTime, Duration, Uuid, DecimalValue, Bytes
} from '../src/ast.js';

test('serialize null', () => {
  const doc = new Document([], [new Node([], [], new XObject(new Map([
    ['value', new Node([], [], new Null())]
  ])))]);
  const output = toStringCompact(doc);
  assert.ok(output.includes('null'));
});

test('serialize bool', () => {
  const doc = parseStr('a: true, b: false');
  const output = toStringCompact(doc);
  assert.ok(output.includes('true'));
  assert.ok(output.includes('false'));
});

test('serialize int', () => {
  const doc = parseStr('value: 42');
  const output = toStringCompact(doc);
  assert.ok(output.includes('42'));
});

test('serialize float', () => {
  const doc = parseStr('value: 3.14');
  const output = toStringCompact(doc);
  assert.ok(output.includes('3.14'));
});

test('serialize string', () => {
  const doc = parseStr('value: "hello"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('"hello"'));
});

test('serialize string with escapes', () => {
  const doc = parseStr('value: "line1\\nline2"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('\\n'));
});

test('serialize decimal', () => {
  const doc = parseStr('value: d"19.99"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('d"19.99"'));
});

test('serialize bytes', () => {
  const doc = parseStr('value: b"SGVsbG8="');
  const output = toStringCompact(doc);
  assert.ok(output.includes('b"'));
});

test('serialize uuid', () => {
  const doc = parseStr('value: u"550e8400-e29b-41d4-a716-446655440000"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('u"550e8400-e29b-41d4-a716-446655440000"'));
});

test('serialize datetime', () => {
  const doc = parseStr('value: t"2025-01-15T10:30:00Z"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('t"'));
});

test('serialize duration', () => {
  const doc = parseStr('value: r"PT30S"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('r"PT30S"'));
});

test('serialize array', () => {
  const doc = parseStr('value: [1, 2, 3]');
  const output = toStringCompact(doc);
  assert.ok(output.includes('['));
  assert.ok(output.includes(']'));
});

test('serialize object', () => {
  const doc = parseStr('value: {a: 1, b: 2}');
  const output = toStringCompact(doc);
  assert.ok(output.includes('{'));
  assert.ok(output.includes('}'));
});

test('serialize tags', () => {
  const doc = parseStr('value: #important #urgent "task"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('#important'));
  assert.ok(output.includes('#urgent'));
});

test('serialize annotations', () => {
  const doc = parseStr('value: @mime("image/png") "data"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('@mime("image/png")'));
});

test('serialize annotation with multiple args', () => {
  const doc = parseStr('value: @size(100, 200) "data"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('@size(100, 200)'));
});

test('serialize prolog', () => {
  const doc = parseStr('$schema: "test.json", key: "value"');
  const output = toStringCompact(doc);
  assert.ok(output.includes('$schema:'));
});

test('pretty format has newlines', () => {
  const doc = parseStr('a: 1, b: 2');
  const output = toStringPretty(doc);
  assert.ok(output.includes('\n'));
});

test('compact format has no newlines', () => {
  const doc = parseStr('a: 1, b: 2');
  const output = toStringCompact(doc);
  assert.ok(!output.includes('\n'));
});

test('custom format', () => {
  const doc = parseStr('arr: [1, 2, 3]');
  const format = new Format(true, 4, false);
  const output = toStringWithFormat(doc, format);
  assert.ok(output.includes('    ')); // 4 spaces indent
});

test('trailing commas in pretty', () => {
  const doc = parseStr('arr: [1, 2, 3]');
  const output = toStringPretty(doc);
  // Should have trailing comma before closing bracket
  const lines = output.split('\n');
  const lastItemLine = lines.find(l => l.includes('3'));
  assert.ok(lastItemLine.includes(','));
});

test('no trailing commas when disabled', () => {
  const doc = parseStr('arr: [1]');
  const format = new Format(true, 2, false);
  const output = toStringWithFormat(doc, format);
  const lines = output.split('\n');
  const itemLine = lines.find(l => l.trim().startsWith('1'));
  assert.ok(!itemLine.trim().endsWith(','));
});

test('quoted keys for non-identifiers', () => {
  const doc = parseStr('{"key with spaces": 1}');
  const output = toStringCompact(doc);
  assert.ok(output.includes('"key with spaces"'));
});

test('unquoted keys for simple identifiers', () => {
  const doc = parseStr('{simple_key: 1}');
  const output = toStringCompact(doc);
  assert.ok(output.includes('simple_key:'));
  assert.ok(!output.includes('"simple_key"'));
});

test('roundtrip preserves data', () => {
  const source = `
    $schema: "test",
    name: "test",
    items: [
      #tag1 @anno(1) "item1",
      #tag2 "item2",
    ],
    config: {
      debug: true,
      count: 42,
    },
  `;
  const doc1 = parseStr(source);
  const output1 = toStringPretty(doc1);
  const doc2 = parseStr(output1);
  const output2 = toStringPretty(doc2);
  assert.strictEqual(output1, output2);
});
