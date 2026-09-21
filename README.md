# Twirler

> Keyboard-layout text converter. Type in the wrong layout — Twirler twists it back.

`Twirler` converts text typed in one keyboard layout into another by matching characters position-by-position across layout strings. No `KeyboardEvent.code`, no hardcoded key maps — just two parallel strings of characters in physical-key order.

```js
import { Twirler } from './twirler.js';

const twirler = new Twirler().add('/layouts/all.json');

await twirler.twist('ghbdtn').to('ru');   // "привет"
await twirler.twist('привет').to('en');   // "ghbdtn"
```

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Layout Format](#layout-format)
- [API Reference](#api-reference)
  - [`new Twirler()`](#new-twirler)
  - [`twirler.add(src, locale?)`](#twirleraddsrc-locale)
  - [`twirler.twist(text)`](#twirlertwisttext)
  - [`twirler.ready()`](#twirlerready)
  - [Chain methods](#chain-methods)
- [Error Messages](#error-messages)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [Limitations](#limitations)

---

## Installation

Copy `twirler.js` into your project, or import it as an ES module:

```js
import { Twirler } from './twirler.js';
```

No dependencies. Works in browsers and Node.js (18+, native `fetch`).

---

## Quick Start

```js
import { Twirler } from './twirler.js';

const twirler = new Twirler()
  .add('/layouts/ru.json', 'ru')
  .add('/layouts/en.json', 'en');

// Explicit target
await twirler.twist('ghbdtn').to('ru');            // "привет"
await twirler.twist('привет').to('en');            // "ghbdtn"

// Explicit source and target
await twirler.twist('ghbdtn').from('en').to('ru'); // "привет"

// Cycle to the next registered locale
await twirler.twist('ghbdtn').next();              // "привет"
await twirler.twist('привет').next();              // "ghbdtn"

// Auto-detect and pick target automatically
await twirler.twist('ghbdtn');                     // "привет"
await twirler.twist('Привет');                     // "Ghbdtn"
```

---

## Layout Format

A layout is **two parallel strings of equal length**, separated by `|`:

```
base|shift
```

- **`base`** — characters typed without modifiers
- **`shift`** — characters typed with `Shift`

Characters are written in **physical-key order**, exactly as they appear on the keyboard row-by-row. The same order must be used in every layout.

### Bundled JSON

One file containing every locale:

```json
{
  "en": "qwertyuiop[]asdfghjkl;'zxcvbnm,./|QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?",
  "ru": "йцукенгшщзхъфывапролджэячсмитьбю.|ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"
}
```

### Per-locale JSON

`layouts/ru.json`:

```json
"йцукенгшщзхъфывапролджэячсмитьбю.|ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"
```

Or as a plain object with a named single layout:

```json
{
  "base":  "йцукенгшщзхъфывапролджэячсмитьбю.",
  "shift": "ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"
}
```

Or as a two-element array:

```json
["йцукенгшщзхъфывапролджэячсмитьбю.", "ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"]
```

If `shift` is omitted, it defaults to `base.toUpperCase()`. This works for letters but breaks on punctuation (`;` ↔ `ж` needs an explicit shift string), so **always provide both** for real layouts.

### Rules

| Rule | Why |
|---|---|
| `base.length === shift.length` | Positions must line up |
| Same length across all layouts | Physical key order must match |
| No duplicate characters within a layout | `indexOf` finds the first match only |
| Order = physical key order | Position `i` in layout A maps to position `i` in layout B |

---

## API Reference

### `new Twirler()`

Creates an empty instance. No layouts registered yet.

```js
const twirler = new Twirler();
```

---

### `twirler.add(src, locale?)`

Registers one or more layouts. Returns `this`, so it's chainable.

> **Note:** `add` is asynchronous internally. The returned object is the `Twirler` instance, not a promise. Awaiting happens lazily inside `twist(...)`.

#### Signatures

```js
add('/layouts/all.json')              // bundle — registers every locale inside
add('/layouts/ru.json')               // single — locale inferred from filename
add('/layouts/ru.json', 'ru')         // single — explicit locale
add({ ru: '...', en: '...' })         // bundle object
add('йцу...|ЙЦУ...', 'ru')            // inline string — locale required
add('йцу...|ЙЦУ...')                  // throws: locale cannot be inferred
```

#### Parameters

| Name | Type | Description |
|---|---|---|
| `src` | `string \| object` | URL, JSON object, or inline layout string |
| `locale` | `string?` | Locale code (`"ru"`, `"en-US"`, `"de"`). Required for inline strings; optional for URLs (inferred from filename); ignored for bundles. |

#### Locale normalization

Locales are normalized to their base language: `"ru-RU"` → `"ru"`, `"en_US"` → `"en"`.

---

### `twirler.twist(text)`

Returns a `Twist` chain for the given text. The chain is **thenable** — you can `await` it directly.

```js
await twirler.twist('ghbdtn').to('ru');
```

---

### `twirler.ready()`

Waits for all pending `add()` operations to settle. Useful when you want to ensure layouts are loaded before doing something else.

```js
await twirler.ready();
```

---

### Chain methods

#### `.from(locale)`

Explicitly set the source locale. Skips auto-detection.

```js
twirler.twist('ghbdtn').from('en').to('ru');
```

#### `.to(locale)`

Set the target locale. This is the terminal method in most chains.

```js
twirler.twist('ghbdtn').to('ru');
```

#### `.next()`

Convert to the next locale in registration order, wrapping around. Useful for toggling between two languages.

```js
// with layouts registered as ru, en
twirler.twist('ghbdtn').next();   // en → ru  → "привет"
twirler.twist('привет').next();   // ru → en  → "ghbdtn"
```

#### `.auto()`

Reset to auto-detect mode (default). Picks the target as the first registered locale that differs from the detected source.

```js
twirler.twist('ghbdtn').auto();
```

#### `await` / `.then()` / `.catch()` / `.finally()`

The `Twist` object is thenable — every promise method works.

```js
const result = await twirler.twist('ghbdtn').to('ru');
twirler.twist('ghbdtn').to('ru').then(console.log);
twirler.twist('ghbdtn').to('ru').catch(console.error);
```

---

## Error Messages

All errors are thrown as `Error` with descriptive messages.

| Situation | Message |
|---|---|
| `fetch` failed | `Failed to load "<url>": HTTP <status>` |
| Value is not string/array/object | `Layout "<locale>": unsupported value type` |
| base/shift length mismatch | `Layout "<locale>": base length (N) does not match shift length (M)` |
| Empty layout string | `Layout "<locale>": empty string` |
| Cross-layout length mismatch | `Incompatible layouts: length N does not match M. All layouts must use the same physical key order.` |
| Missing locale for single layout | `Cannot determine locale: pass it explicitly, e.g. add("/layouts/xx.json", "xx")` |
| No layouts registered | `No layouts registered` |
| Cannot detect source language | `Could not detect source language` |
| Source locale not loaded | `No layout registered for "<locale>"` |
| Source not in registration order | `"<locale>" is not registered` |
| Target locale not loaded | `No layout registered for "<locale>"` |

---

## How It Works

Every layout is a pair of strings in **physical-key order**:

```
en:  q w e r t y ... ; ' z x c v ...
ru:  й ц у к е н ... ж э я ч с м ...
      ↑  ↑  ↑        ↑  ↑  ↑
    same physical key, different character
```

Converting `"ghbdtn"` from `en` to `ru` means:

1. For each character in `"ghbdtn"`, find its index in the source layout's `base` (or `shift` for uppercase).
2. Take the character at the same index in the target layout.
3. `g` (index 4) → `п` (index 4), `h` → `р`, `b` → `и`, `d` → `в`, `t` → `е`, `n` → `т`.
4. Result: `"привет"`.

Characters not found in the source layout (spaces, emoji, punctuation not on the keyboard) pass through unchanged.

Because the mapping is `indexOf` + `charAt`, the algorithm is `O(n)` where `n` is the number of characters — and it handles Shift, uppercase, and punctuation automatically without any extra tables.

---

## Examples

### Two-locale toggle

```js
const twirler = new Twirler()
  .add('/layouts/ru.json')
  .add('/layouts/en.json');

await twirler.twist('ghbdtn').next();  // "привет"
await twirler.twist('привет').next();  // "ghbdtn"
```

### Bundle file

```js
const twirler = new Twirler().add('/layouts/all.json');

await twirler.twist('ghbdtn').to('ru');
```

### Inline layouts (no files at all)

```js
const twirler = new Twirler()
  .add('qwertyuiop[]asdfghjkl;\'zxcvbnm,./|QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?', 'en')
  .add('йцукенгшщзхъфывапролджэячсмитьбю.|ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,', 'ru');

await twirler.twist('ghbdtn').to('ru');
```

### Adding a layout at runtime

```js
// User uploads their own layout — register it on the fly
const custom = await fetch('/user/layout.json').then(r => r.json());
twirler.add(custom, 'ru');

await twirler.twist('ghbdtn').to('ru');  // uses the new layout
```

### Auto-detect source, pick target explicitly

```js
await twirler.twist('ghbdtn').to('ru');   // auto-detects EN, targets RU
await twirler.twist('привет').to('en');   // auto-detects RU, targets EN
```

### Full auto

```js
await twirler.twist('ghbdtn');            // "привет"
await twirler.twist('Привет');            // "Ghbdtn"
```

---

## Limitations

- **Layouts must share physical key order.** Length equality is checked; order is your responsibility.
- **No duplicate characters** within a single layout. `indexOf` returns the first match.
- **Auto-detection is script-based.** It uses Unicode blocks (`\u0400-\u04FF` for Cyrillic, `a-zA-Z` for Latin, etc.). Ambiguous scripts (e.g. Latin vs. Latin) fall back to `en`.
- **No layout switching.** The browser cannot change the OS keyboard layout. `Twirler` converts text, not input.
- **Bundles cannot be nested.** A JSON object is either a flat bundle of layouts or a single layout object — not both.

---

## License

MIT
