# data-matching — API documentation

This document describes all the matchers and helper functions exported by
`data-matching`. For a quick start, see the [README](README.md).

All matcher-generating functions (`partial_match`, `full_match`, `json`,
`xml`, `kv_str`, `www_form_urlencoded`, `string_list`, `any_of`, `matcher`,
`unordered_list`, `gen_gen_matcher`, ...) return a **matcher function** with
the signature:

```
matcher(received, dict, throw_matching_error, path) => boolean
```

- `received`: the data to check.
- `dict`: a plain object used to collect values via `dm.collect(name)` (aka
  `dm.$(name)`). Pass `{}` and read the collected values afterwards.
- `throw_matching_error`: if `true`, a `MatchingError` is thrown on the first
  mismatch (with a description of where/why it failed); if `false`, the
  matcher simply returns `false`.
- `path`: a string used to build the location reported in `MatchingError`
  (start with `"root"` or `""`).

## Table of contents

- [Core matching](#core-matching)
  - [partial_match / pm](#partial_match--pm)
  - [full_match / fm](#full_match--fm)
- [Collecting values](#collecting-values)
  - [collect / $](#collect--)
  - [push](#push)
  - [pop](#pop)
- [Special expected values](#special-expected-values)
  - [absent](#absent)
  - [_ (anything)](#_-anything)
  - [String interpolation (`!{name}`)](#string-interpolation-name)
- [Value matchers](#value-matchers)
  - [non_zero](#non_zero)
  - [non_blank_str](#non_blank_str)
  - [str_equal](#str_equal)
  - [matcher](#matcher)
  - [any_of](#any_of)
- [List matchers](#list-matchers)
  - [unordered_list](#unordered_list)
  - [string_list](#string_list)
- [String-encoded payload matchers](#string-encoded-payload-matchers)
  - [json / json_partial_match / json_full_match](#json--json_partial_match--json_full_match)
  - [xml](#xml)
  - [kv_str / kv_str_partial_match / kv_str_full_match](#kv_str--kv_str_partial_match--kv_str_full_match)
  - [www_form_urlencoded / www_form_urlencoded_partial_match / www_form_urlencoded_full_match](#www_form_urlencoded--www_form_urlencoded_partial_match--www_form_urlencoded_full_match)
  - [gen_gen_matcher](#gen_gen_matcher)
- [Working with arrays as pools](#working-with-arrays-as-pools)
  - [pop_match](#pop_match)
  - [reverse_pop_match](#reverse_pop_match)
- [Utilities](#utilities)
  - [matchify_strings](#matchify_strings)
  - [match](#match)
  - [MatchingError](#matchingerror)

---

## Core matching

### `partial_match` / `pm`

```js
dm.partial_match(expected)
```

Returns a matcher that checks that `received` contains (at least) all the
keys/values described in `expected`. Extra keys in `received` are ignored.
Nested objects/arrays are matched recursively (each nested object is also a
partial match, each nested array must have the same length).

### `full_match` / `fm`

```js
dm.full_match(expected)
```

Same as `partial_match`, but `received` must not contain any extra keys not
present in `expected`.

---

## Collecting values

### `collect` / `$`

```js
dm.collect(name, matcher)
```

Marks a value to be captured into `dict[name]` when the surrounding match
succeeds. If `matcher` is provided, the value must also satisfy it (any other
matcher function or a literal, via the usual matching rules) before being
collected. If `name` was already collected earlier in the same match, the new
value must be equal to the previous one (this lets you require, e.g., that
two occurrences of a "call_id" match each other).

### `push`

```js
dm.push(name, matcher)
```

Like `collect`, but appends the value to an array `dict[name]` instead of
overwriting it (creating the array on first use). Useful when the same
matcher is applied multiple times (e.g. inside `unordered_list` or across
several calls to the same matcher) and you want to accumulate every matched
value.

### `pop`

```js
dm.pop(name, matcher)
```

The inverse of `push`: requires `dict[name]` to already be an array
containing `val`, and removes that value from it. Fails (or throws, if
`throw_matching_error` is set) if `dict[name]` is not set, is not an array,
or does not contain `val`.

---

## Special expected values

### `absent`

```js
{ some_key: dm.absent }
```

Used as an expected value to assert that `some_key` must **not** be present
in `received` (or must be `undefined`).

### `_` (anything)

```js
{ some_key: dm._ }
```

Matches any value without collecting it (equivalent to just omitting checks
on that key, but useful e.g. inside arrays or `gen_gen_matcher` queries where
you must supply something).

### String interpolation (`!{name}`)

Any expected string containing the `!{name}` syntax is compiled with the
[`string-matching`](https://github.com/MayamaTakeshi/string-matching)
package and the matched parts are collected into `dict[name]`, e.g.:

```js
{ protocol: '!{transport_protocol}/MRCP!{mrcp_version}' }
```

Use `!!{` to match a literal `!{` without triggering interpolation.

---

## Value matchers

### `non_zero`

```js
{ count: dm.non_zero }
```

Matches any non-zero number.

### `non_blank_str`

```js
{ name: dm.non_blank_str }
```

Matches any non-empty string.

### `str_equal`

```js
{ id: dm.str_equal(1234) }
```

Compares `received.toString()` against `expected.toString()`, so it matches
regardless of whether the actual value is a `Number` or a `String` (handy
when a parser is inconsistent about numeric vs. string types, e.g.
`fast-xml-parser`/`xml2json`).

### `matcher`

```js
dm.matcher(name, fn)
```

Wraps an arbitrary predicate `fn(received) => truthy | falsy | string` into a
named matcher function (the `name` shows up in error messages/`__name__`).
If `fn` returns something other than exactly `true`, it's treated as a
failure reason.

### `any_of`

```js
dm.any_of([expectedA, expectedB, ...], name)
```

Matches if `received` matches **any** of the given expected values/matchers
(tried in order, each with a cloned `dict` so a failed alternative can't
leak partial collects into the outer `dict`). Once a match is found, its
collected values are merged into the real `dict`. If `name` is given, the
whole matched `received` value is additionally stored at `dict[name]`.

---

## List matchers

### `unordered_list`

```js
dm.unordered_list([matcherA, matcherB, ...])
```

Matches `received` (an array) against a list of matchers/expected values
regardless of order: the list lengths must match, and every matcher in
`expected` must pair up with exactly one distinct element of `received`
(collects happen directly into the real `dict` as pairs are found, so avoid
depending on collect order).

### `string_list`

```js
dm.string_list(separator, decoder, expected)
```

Splits a string `received` on `separator` into an array of parts (optionally
transforming each part with `decoder(part)`), then matches the resulting
array against `expected` (partial match semantics, array length must match).

---

## String-encoded payload matchers

These matchers parse a raw string payload before delegating to the regular
object matching logic, so `expected` is written as a normal nested
object/array using `dm.collect`, literals, `!{name}` strings, etc.

### `json` / `json_partial_match` / `json_full_match`

```js
dm.json(expected, full_match)
dm.json_partial_match(expected)
dm.json_full_match(expected)
```

Parses `received` with `JSON.parse` and matches the result against
`expected` (`full_match` boolean selects partial vs. full semantics for the
`json` form directly).

### `xml`

```js
dm.xml(expected, full_match)
```

Parses `received` with [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser)
(`ignoreAttributes: false`, `attributeNamePrefix: ''`, `preserveOrder: true`)
and matches the resulting structure against `expected`.

### `kv_str` / `kv_str_partial_match` / `kv_str_full_match`

```js
dm.kv_str(expected, param_sep, kv_sep, preparse_decoder, postparse_decoder, full_match)
dm.kv_str_partial_match(expected, param_sep, kv_sep, preparse_decoder, postparse_decoder)
dm.kv_str_full_match(expected, param_sep, kv_sep, preparse_decoder, postparse_decoder)
```

Generic "key/value pairs in a string" matcher. `received` string is (1)
optionally transformed by `preparse_decoder(s)`, (2) split on `param_sep`,
(3) each part split on the first `kv_sep` into `key`/`val`, (4) `val`
optionally transformed by `postparse_decoder(val)`, producing an object
`{ key: val, ... }` matched against `expected`. No character decoding
(percent-encoding, `+` as space, etc.) is performed automatically — use
`preparse_decoder`/`postparse_decoder` for that, or use
`www_form_urlencoded` below if your payload is actually
`application/x-www-form-urlencoded`.

```js
var matcher = dm.kv_str({ a: dm.$('a'), b: dm.$('b') }, '&', '=');
matcher('a=1&b=2', dict, false, 'root'); // dict == { a: '1', b: '2' }
```

### `www_form_urlencoded` / `www_form_urlencoded_partial_match` / `www_form_urlencoded_full_match`

```js
dm.www_form_urlencoded(expected, postparse_decoder, full_match)
dm.www_form_urlencoded_partial_match(expected, postparse_decoder)
dm.www_form_urlencoded_full_match(expected, postparse_decoder)
```

Matcher specialized for `application/x-www-form-urlencoded` payloads (e.g.
HTTP request bodies, query strings). It splits `received` on `&`, then for
each `key=value` pair (splitting on the first `=`) decodes both `key` and
`value` following the standard rules: `+` is turned into a space and the
rest is percent-decoded with `decodeURIComponent`. An optional
`postparse_decoder(value)` can further transform each decoded value (e.g.
`JSON.parse` for a field that itself contains urlencoded JSON) before
matching against `expected`. Throws/fails if `received` is not a string.

```js
var matcher = dm.www_form_urlencoded({
    a: dm.$('a'),
    b: dm.$('b'),
});
var dict = {};
matcher('a=1&b=hello+world', dict, false, 'root');
// dict == { a: '1', b: 'hello world' }
```

### `gen_gen_matcher`

```js
dm.gen_gen_matcher(parser, extractor, name) => (expected) => matcher
```

A "matcher generator generator" for query-based formats: given a `parser(s)`
that turns the raw string into some parsed structure, and an
`extractor(parsed, key)` that resolves a query `key` (e.g. an XPath-like
expression, a jq-like selector, etc.) against the parsed structure, it
returns a function that builds a matcher from an `expected` object whose
keys are queries and whose values are matched (partial match) against
whatever `extractor` returns for that query. `dm.absent` can be used as a
value to assert that a query must resolve to nothing. See
`test/gen_gen_matcher.test.js` for a full example using `fast-xml-parser`.

---

## Working with arrays as pools

These are plain functions (not matcher factories) meant to be called
directly against an array you're consuming step by step, typically inside
imperative test/validation code rather than as part of a bigger `expected`
tree.

### `pop_match`

```js
dm.pop_match(expected, array, dict) => removedItem | undefined
```

Scans `array` for the first element that matches `expected` (a matcher
function or a plain expected value/object, partial-match semantics), removes
it from `array` (mutating it) and returns it. Returns `undefined` if no
element matches. Never throws (matching errors are swallowed).

### `reverse_pop_match`

```js
dm.reverse_pop_match(item, array, dict) => removedExpected | undefined
```

The mirror image of `pop_match`: `array` is a list of expected
values/matchers, and this looks for the first one that matches the given
`item`, removes it from `array` and returns it.

---

## Utilities

### `matchify_strings`

```js
dm.matchify_strings(expected)
```

Recursively walks `expected` and replaces any string containing the
`!{name}` syntax with the equivalent `string-matching` matcher function.
Used internally by every matcher factory above; you normally don't need to
call it yourself unless you're building a custom matcher.

### `match`

```js
dm.match(expected, received, dict, full_match, throw_matching_error, path)
```

The low-level recursive matching function used internally by
`partial_match`/`full_match` and friends. Exposed for advanced use cases
(e.g. implementing your own matcher factory, as `gen_gen_matcher` does).

### `MatchingError`

The error class thrown when `throw_matching_error` is `true` and a match
fails. It carries the `path` at which the mismatch occurred and a
human-readable reason.
