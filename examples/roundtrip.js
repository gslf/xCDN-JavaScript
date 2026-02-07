/**
 * Roundtrip Example
 * Demonstrates parsing and re-serialization of xCDN documents
 */

import { parseStr, toStringPretty, toStringCompact } from '../src/index.js';

// Example xCDN document
const source = `
$schema: "https://gslf.github.io/xCDN/schemas/v1/meta.xcdn",

// User configuration
user: {
  name: "Mario Rossi",
  age: 30,
  email: "mario@example.com",
  active: true,

  // Preferences
  preferences: {
    theme: "dark",
    language: "it",
    notifications: true,
  },

  // Tags and annotations
  roles: [
    #admin "administrator",
    #user "standard",
  ],
},

// Binary data
avatar: @mime("image/png") b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",

// Timestamp
created_at: t"2025-01-15T10:30:00Z",

// UUID
session_id: u"550e8400-e29b-41d4-a716-446655440000",

// Decimals for monetary values
balance: d"1234.56",

// Duration
timeout: r"PT30S",
`;

console.log('=== Original Source ===');
console.log(source);

// Parse
const doc = parseStr(source);

console.log('\n=== Parsed Document ===');
console.log('Prolog directives:', doc.prolog.length);
console.log('Top-level values:', doc.values.length);

// Access values using clean API
console.log('\nUser name:', doc.get('user').get('name').unwrap());
console.log('User age:', doc.get('user').get('age').unwrap());

// Re-serialize in pretty format
console.log('\n=== Pretty Output ===');
const pretty = toStringPretty(doc);
console.log(pretty);

// Re-serialize in compact format
console.log('\n=== Compact Output ===');
const compact = toStringCompact(doc);
console.log(compact);

// Verify roundtrip
console.log('\n=== Roundtrip Verification ===');
const reparsed = parseStr(pretty);
const reprettied = toStringPretty(reparsed);
console.log('Roundtrip successful:', pretty === reprettied);
