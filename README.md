# > xCDN_ (JavaScript)

A complete JavaScript library to parse, serialize and deserialize **> xCDN_ — eXtensible Cognitive Data Notation**.

> **What is > xCDN_?**
> xCDN_ is a human-first, machine-optimized data notation with native types, tags and annotations.
> It supports comments, trailing commas, unquoted keys and multi-line strings.
> You can read more about this notation in the [> xCDN_ repository](https://github.com/gslf/xCDN).

## Features

- Full streaming document model (one or more top-level values)
- Optional **prolog** (`$schema: "..."`, ...)
- Objects, arrays and scalars
- Native types: `Decimal` (`d"..."`), `UUID` (`u"..."`), `DateTime` (`t"..."` RFC3339),
  `Duration` (`r"..."` ISO8601), `Bytes` (`b"..."` Base64)
- `#tags` and `@annotations(args?)` that decorate any value
- Comments: `//` and `/* ... */`
- Trailing commas and unquoted keys
- Pretty or compact serialization
- Zero dependencies

## Example

```xcdn
$schema: "https://gslf.github.io/xCDN/schemas/v1/meta.xcdn",

server_config: {
  host: "localhost",
  // Unquoted keys & trailing commas? Yes.
  ports: [8080, 9090,],

  // Native Decimals & ISO8601 Duration
  timeout: r"PT30S",
  max_cost: d"19.99",

  // Semantic Tagging
  admin: #user {
    id: u"550e8400-e29b-41d4-a716-446655440000",
    role: "superuser"
  },

  // Binary data handling
  icon: @mime("image/png") b"iVBORw0KGgoAAAANSUhEUgAAAAUA...",
}
```

## Installation

```bash
npm install xcdn
```

## Usage

```javascript
import xcdn from 'xcdn';

// Parse an xCDN string
const doc = xcdn.parse(`
  name: "Alice",
  age: 30,
  active: true,
`);

// Pretty-print
console.log(xcdn.stringify(doc));

// Compact output
console.log(xcdn.stringifyCompact(doc));
```

### Named imports

```javascript
import { parseStr, toStringPretty, toStringCompact } from 'xcdn';

const doc = parseStr(source);
const pretty = toStringPretty(doc);
const compact = toStringCompact(doc);
```

### Accessing fields

```javascript
import { parseStr } from 'xcdn';

const doc = parseStr(`
  user: {
    name: "Mario Rossi",
    age: 30,
    roles: [#admin "administrator", #user "standard"],
  },
  session_id: u"550e8400-e29b-41d4-a716-446655440000",
  balance: d"1234.56",
  created_at: t"2025-01-15T10:30:00Z",
`);

// Chained get() — no .value needed between levels
doc.get('user').get('name').unwrap();  // "Mario Rossi"
doc.get('user').get('age').unwrap();   // 30n (BigInt)
doc.get('balance').unwrap();           // "1234.56"

// Check keys
doc.has('user');       // true
doc.get(0).keys();     // ["user", "session_id", "balance", "created_at"]

// Iterate decorated items
const roles = doc.get('user').get('roles');
for (const role of roles) {
  console.log(role.tags[0].name, role.unwrap());
  // "admin" "administrator"
  // "user"  "standard"
}

// Recursively unwrap to plain JS object
doc.get('user').unwrap();
// { name: "Mario Rossi", age: 30n, roles: ["administrator", "standard"] }
```

### Sub-module imports

```javascript
import { Parser } from 'xcdn/parser';
import { Serializer, Format } from 'xcdn/serializer';
import { XObject, XArray, Node, XString } from 'xcdn/ast';
import { XCDNError } from 'xcdn/error';
import { Lexer } from 'xcdn/lexer';
```

## Testing

```bash
npm test
```

## License

MIT, see [LICENSE](LICENSE).

---

#### This is a :/# GSLF project.
