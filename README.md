# KeySwap

Convert text typed in the wrong keyboard layout. If you meant to type `привет` but your keyboard was in English and you got `ghbdtn`, KeySwap fixes it — and the other way around.

The library maps characters by their **physical key index**: it finds each character of the source layout in `base` or `shift`, then takes the character at the same index in the target layout. Unknown characters (spaces, punctuation, emoji) pass through unchanged.

Source language is detected automatically from Unicode script, with per-language disambiguation for scripts that are shared by many languages (Cyrillic, Latin, Arabic). You can also set the source and target explicitly.

- Zero dependencies.
- Works in browsers and modern Node (uses `fetch` for loading layouts from URLs).
- Chainable API, `await`-friendly.

---

## Installation

```bash
npm install keyswap
```

Or just drop `keyswap.js` into your project and import it — there are no runtime dependencies.

```js
import KeySwap from 'keyswap';
// or, from a local file:
import KeySwap from './keyswap.js';
```

---

## Connecting layouts

Create an instance once, then register one or more layouts. All layouts **must use the same physical key order** (same string length for `base`, and same length for `shift`), otherwise `add()` throws.

```js
import KeySwap from './keyswap.js';

const kb = new KeySwap();
```

### 1. From a URL to a bundle of layouts

A bundle is a JSON object whose keys are locale codes and whose values are layouts.

```js
kb.add('https://example.com/layouts/all.json');
// all.json:
// {
//   "ru": "йцукенгшщзхъфывапролджэячсмитьбю.|ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,",
//   "en": "qwertyuiop[]asdfghjkl;'zxcvbnm,./|QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?"
// }
```

### 2. From a URL to a single layout, locale inferred from the filename

```js
kb.add('/layouts/ru.json');   // locale "ru" is parsed from "ru.json"
```

### 3. From a URL to a single layout, locale passed explicitly

```js
kb.add('/layouts/ru.json', 'ru');
```

### 4. From an inline object as a bundle

```js
kb.add({
  ru: 'йцукенгшщзхъфывапролджэячсмитьбю.|ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,',
  en: 'qwertyuiop[]asdfghjkl;\'zxcvbnm,./|QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?'
});
```

### 5. From an inline string, with `|` separating base and shift

```js
kb.add('йцукенгшщзхъфывапролджэячсмитьбю.|ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,', 'ru');
```

### 6. From an inline string, without `|` — shift is derived via `toUpperCase()`

```js
kb.add('qwertyuiopasdfghjklzxcvbnm', 'en');
```

### 7. From an inline array `[base, shift]`

```js
kb.add(['йцукенгшщзхъфывапролджэячсмитьбю.', 'ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,'], 'ru');
// shift is optional:
kb.add(['qwertyuiopasdfghjklzxcvbnm'], 'en');
```

### 8. From an inline object `{ base, shift }` (or `{ lower, upper }`)

```js
kb.add({ base: 'йцукен...', shift: 'ЙЦУКЕН...' }, 'ru');
kb.add({ lower: 'qwerty...', upper: 'QWERTY...' }, 'en');
```

### 9. Chaining several layouts

`add()` returns `this`, so you can chain:

```js
kb.add('/layouts/ru.json')
  .add('/layouts/en.json')
  .add('/layouts/de.json');
```

### Awaiting load

Loading is deferred. Await `ready()` before doing conversions, or just `await` the conversion itself (it waits internally):

```js
await kb.ready();
// or rely on the chain:
await kb.swap('ghbdtn').to('ru');
```

---

## Usage

The entry point is `swap(text)`, returning a chain with `.from()`, `.to()`, `.next()`, `.auto()`. The chain is `await`-able directly.

### 1. Explicit target locale (most common)

```js
await kb.swap('ghbdtn').to('ru');   // 'привет'
```

### 2. Auto-detected source, explicit target

```js
await kb.swap('привет').to('en');   // 'ghbdtn'
```

### 3. Auto-detected source, next registered layout as target

```js
// If layouts were registered in order ru → en, this swaps ru → en.
await kb.swap('привет').next();     // 'ghbdtn'
```

### 4. Explicit source and target

```js
await kb.swap('ghbdtn').from('en').to('ru');   // 'привет'
```

### 5. Auto mode (detect source, pick next layout)

```js
await kb.swap('ghbdtn').auto();     // detect en, use next layout
```

### 6. Set the target first, source later

```js
await kb.swap('ghbdtn').to('ru').from('en');   // same as above
```

### 7. Reuse the chain for several strings

```js
const c = kb.swap('ghbdtn').to('ru');
await c;             // first call
// Note: a chain computes on every await; call .swap() again if you need a fresh chain.
```

### 8. Works with punctuation, spaces, and emoji

Unknown characters are passed through unchanged:

```js
await kb.swap('ghbdtn, world!').to('ru');    // 'привет, world!'
await kb.swap('ghbdtn 🙂').to('ru');          // 'привет 🙂'
```

### 9. Uppercase and shifted characters are handled

```js
await kb.swap('GHBDTN').to('ru');            // 'ПРИВЕТ'
await kb.swap('Ghbdtn').to('ru');            // 'Привет'
```

### 10. Non-awaiting use (promise style)

```js
kb.swap('ghbdtn').to('ru').then(s => console.log(s));   // 'привет'
kb.swap('ghbdtn').to('ru').catch(console.error);
kb.swap('ghbdtn').to('ru').finally(() => console.log('done'));
```

### 11. Full example

```js
import KeySwap from './keyswap.js';

const kb = new KeySwap();
kb.add('/layouts/ru.json').add('/layouts/en.json');
await kb.ready();

const fixed = await kb.swap('ghbdtn').to('ru');
console.log(fixed);   // 'привет'
```

---

## API summary

### `new KeySwap()`

Creates an instance.

### `add(src, locale?)`

Registers one layout or a bundle. Returns `this`. Accepts:

- a URL or path to a JSON file (bundle or single layout);
- a bundle object `{ ru: ..., en: ... }`;
- an inline string with `|` separator;
- an inline string without `|` (shift via `toUpperCase()`);
- an inline array `[base, shift?]`;
- an inline object `{ base, shift }` or `{ lower, upper }`.

### `ready(): Promise<void>`

Resolves when all `add()` calls have finished loading.

### `swap(text): SwapChain`

Starts a conversion chain.

### `SwapChain`

- `.from(locale)` — set the source locale.
- `.to(locale)` — set the target locale.
- `.next()` — pick the next registered layout as the target.
- `.auto()` — auto-detect the source (default).
- `then / catch / finally` — makes the chain awaitable.

### Locale normalization

Locale codes are normalized: lowercase, and everything after the first `-` or `_` is dropped. `ru-RU` → `ru`, `en_US` → `en`.

---

## Notes and limitations

- **Script ≠ language.** Detection is heuristic. Cyrillic defaults to `ru`, Latin to `en`, Arabic to `ar`. Languages with distinguishing letters (Ukrainian, Belarusian, Serbian, German, Spanish, …) are detected by those letters.
- **Layouts must be index-aligned.** All registered layouts must share the same physical key order. Mixing a 33-key Russian layout with a 26-key Latin one is fine *only if* the string lengths match (they usually don't — pad to the same length or pick layouts designed for the same keyboard).
- **`|` is a hard separator.** If your layout itself contains `|` (Shift + `\` on the Russian layout), pass it as an array or object instead of a `|`-joined string.
- For robust multilingual detection, pair KeySwap with a real detector such as `franc` or `cld3`.