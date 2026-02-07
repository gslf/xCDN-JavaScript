/**
 * Lexer Tests for xCDN
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { Lexer, TokenType } from '../src/lexer.js';

test('lexer tokenizes braces', () => {
  const lexer = new Lexer('{}[]()');
  assert.strictEqual(lexer.nextToken().kind, TokenType.LBRACE);
  assert.strictEqual(lexer.nextToken().kind, TokenType.RBRACE);
  assert.strictEqual(lexer.nextToken().kind, TokenType.LBRACKET);
  assert.strictEqual(lexer.nextToken().kind, TokenType.RBRACKET);
  assert.strictEqual(lexer.nextToken().kind, TokenType.LPAREN);
  assert.strictEqual(lexer.nextToken().kind, TokenType.RPAREN);
  assert.strictEqual(lexer.nextToken().kind, TokenType.EOF);
});

test('lexer tokenizes punctuation', () => {
  const lexer = new Lexer(':,$#@');
  assert.strictEqual(lexer.nextToken().kind, TokenType.COLON);
  assert.strictEqual(lexer.nextToken().kind, TokenType.COMMA);
  assert.strictEqual(lexer.nextToken().kind, TokenType.DOLLAR);
  assert.strictEqual(lexer.nextToken().kind, TokenType.HASH);
  assert.strictEqual(lexer.nextToken().kind, TokenType.AT);
});

test('lexer tokenizes keywords', () => {
  const lexer = new Lexer('true false null');
  const t1 = lexer.nextToken();
  assert.strictEqual(t1.kind, TokenType.TRUE);
  assert.strictEqual(t1.value, true);

  const t2 = lexer.nextToken();
  assert.strictEqual(t2.kind, TokenType.FALSE);
  assert.strictEqual(t2.value, false);

  const t3 = lexer.nextToken();
  assert.strictEqual(t3.kind, TokenType.NULL);
  assert.strictEqual(t3.value, null);
});

test('lexer tokenizes identifiers', () => {
  const lexer = new Lexer('foo bar_baz some-ident _private');
  assert.strictEqual(lexer.nextToken().value, 'foo');
  assert.strictEqual(lexer.nextToken().value, 'bar_baz');
  assert.strictEqual(lexer.nextToken().value, 'some-ident');
  assert.strictEqual(lexer.nextToken().value, '_private');
});

test('lexer tokenizes integers', () => {
  const lexer = new Lexer('123 -456 +789 0');
  const t1 = lexer.nextToken();
  assert.strictEqual(t1.kind, TokenType.INT);
  assert.strictEqual(t1.value, 123n);

  const t2 = lexer.nextToken();
  assert.strictEqual(t2.kind, TokenType.INT);
  assert.strictEqual(t2.value, -456n);

  const t3 = lexer.nextToken();
  assert.strictEqual(t3.kind, TokenType.INT);
  assert.strictEqual(t3.value, 789n);

  const t4 = lexer.nextToken();
  assert.strictEqual(t4.kind, TokenType.INT);
  assert.strictEqual(t4.value, 0n);
});

test('lexer tokenizes floats', () => {
  const lexer = new Lexer('1.23 -4.56 .789 1e10 2.5E-3');
  const t1 = lexer.nextToken();
  assert.strictEqual(t1.kind, TokenType.FLOAT);
  assert.strictEqual(t1.value, 1.23);

  const t2 = lexer.nextToken();
  assert.strictEqual(t2.kind, TokenType.FLOAT);
  assert.strictEqual(t2.value, -4.56);

  const t3 = lexer.nextToken();
  assert.strictEqual(t3.kind, TokenType.FLOAT);
  assert.strictEqual(t3.value, 0.789);

  const t4 = lexer.nextToken();
  assert.strictEqual(t4.kind, TokenType.FLOAT);
  assert.strictEqual(t4.value, 1e10);

  const t5 = lexer.nextToken();
  assert.strictEqual(t5.kind, TokenType.FLOAT);
  assert.strictEqual(t5.value, 2.5e-3);
});

test('lexer tokenizes strings', () => {
  const lexer = new Lexer('"hello" "world"');
  const t1 = lexer.nextToken();
  assert.strictEqual(t1.kind, TokenType.STRING);
  assert.strictEqual(t1.value, 'hello');

  const t2 = lexer.nextToken();
  assert.strictEqual(t2.kind, TokenType.STRING);
  assert.strictEqual(t2.value, 'world');
});

test('lexer handles string escapes', () => {
  const lexer = new Lexer('"a\\"b" "a\\nb" "a\\tb" "a\\\\b"');
  assert.strictEqual(lexer.nextToken().value, 'a"b');
  assert.strictEqual(lexer.nextToken().value, 'a\nb');
  assert.strictEqual(lexer.nextToken().value, 'a\tb');
  assert.strictEqual(lexer.nextToken().value, 'a\\b');
});

test('lexer handles unicode escapes', () => {
  const lexer = new Lexer('"\\u0041\\u0042\\u0043"');
  assert.strictEqual(lexer.nextToken().value, 'ABC');
});

test('lexer tokenizes triple strings', () => {
  const lexer = new Lexer('"""hello\nworld"""');
  const t = lexer.nextToken();
  assert.strictEqual(t.kind, TokenType.TRIPLE_STRING);
  assert.strictEqual(t.value, 'hello\nworld');
});

test('lexer tokenizes typed strings', () => {
  const lexer = new Lexer('d"1.23" b"SGVsbG8=" u"550e8400-e29b-41d4-a716-446655440000" t"2025-01-01T00:00:00Z" r"PT30S"');

  const t1 = lexer.nextToken();
  assert.strictEqual(t1.kind, TokenType.D_QUOTED);
  assert.strictEqual(t1.value, '1.23');

  const t2 = lexer.nextToken();
  assert.strictEqual(t2.kind, TokenType.B_QUOTED);
  assert.strictEqual(t2.value, 'SGVsbG8=');

  const t3 = lexer.nextToken();
  assert.strictEqual(t3.kind, TokenType.U_QUOTED);
  assert.strictEqual(t3.value, '550e8400-e29b-41d4-a716-446655440000');

  const t4 = lexer.nextToken();
  assert.strictEqual(t4.kind, TokenType.T_QUOTED);
  assert.strictEqual(t4.value, '2025-01-01T00:00:00Z');

  const t5 = lexer.nextToken();
  assert.strictEqual(t5.kind, TokenType.R_QUOTED);
  assert.strictEqual(t5.value, 'PT30S');
});

test('lexer skips whitespace', () => {
  const lexer = new Lexer('   foo   bar   ');
  assert.strictEqual(lexer.nextToken().value, 'foo');
  assert.strictEqual(lexer.nextToken().value, 'bar');
  assert.strictEqual(lexer.nextToken().kind, TokenType.EOF);
});

test('lexer skips line comments', () => {
  const lexer = new Lexer('foo // comment\nbar');
  assert.strictEqual(lexer.nextToken().value, 'foo');
  assert.strictEqual(lexer.nextToken().value, 'bar');
});

test('lexer skips block comments', () => {
  const lexer = new Lexer('foo /* comment */ bar');
  assert.strictEqual(lexer.nextToken().value, 'foo');
  assert.strictEqual(lexer.nextToken().value, 'bar');
});

test('lexer tracks line and column', () => {
  const lexer = new Lexer('foo\nbar\n  baz');
  const t1 = lexer.nextToken();
  assert.strictEqual(t1.span.line, 1);
  assert.strictEqual(t1.span.column, 1);

  const t2 = lexer.nextToken();
  assert.strictEqual(t2.span.line, 2);
  assert.strictEqual(t2.span.column, 1);

  const t3 = lexer.nextToken();
  assert.strictEqual(t3.span.line, 3);
  assert.strictEqual(t3.span.column, 3);
});

test('lexer returns EOF at end', () => {
  const lexer = new Lexer('');
  const t = lexer.nextToken();
  assert.strictEqual(t.kind, TokenType.EOF);
});
