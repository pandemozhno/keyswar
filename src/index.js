// ─── Language detection by Unicode block/script (for auto-direction) ───
//
// IMPORTANT: Unicode script ≠ language. A single script (Cyrillic, Latin,
// Arabic) serves dozens of languages. Therefore:
//   1) First come "disambiguating" regexes — rare letters characteristic
//      of a specific language (і, ї, є, ґ → Ukrainian; ß → German, etc.).
//      They MUST be checked BEFORE the general scripts, otherwise Cyrillic
//      will "swallow" Ukrainian and return 'ru'.
//   2) Then come the general scripts via \p{Script=...}. This is more
//      reliable than block ranges because it covers the entire script,
//      including supplementary and historical characters.
//
// SCRIPT is an array of [RegExp, language code] pairs. Order MATTERS:
// .find() returns the first match, so more specific rules go on top.
const SCRIPT = [
  // ——— disambiguators for languages sharing a script (checked before general ones) ———
  [/[іїєґ]/i, 'uk'],                 // Ukrainian: letters absent from Russian
  [/[ў]/i, 'be'],                    // Belarusian: "short u"
  [/[ђјљњћџ]/i, 'sr'],               // Serbian: specific Cyrillic letters
  [/[ѓќѕ]/i, 'mk'],                  // Macedonian
  [/[қғңұүһәө]/i, 'kk'],             // Kazakh (and close Turkic languages)
  [/[ß]/i, 'de'],                    // German: eszett
  [/[ñ]/i, 'es'],                    // Spanish: tilde over n
  [/[ãõç]/i, 'pt'],                  // Portuguese: nasal vowels + ç
  [/[àâçéèêëîïôûùüÿœæ]/i, 'fr'],     // French: diacritics + ligatures
  [/[åäöøæ]/i, 'sv'],                // Swedish/Norwegian/Danish
  [/[ąčęłńóśźż]/i, 'pl'],            // Polish: ł, ą, ę, etc.
  [/[ěščřžýáíéůú]/i, 'cs'],          // Czech: hačeks and long vowels
  [/[őű]/i, 'hu'],                   // Hungarian: double acute
  [/[şğıİ]/i, 'tr'],                 // Turkish: dotted and dotless I
  [/[ăâîșț]/i, 'ro'],                // Romanian: ș, ț with comma below

  // ——— main scripts (broad rules, checked later) ———
  [/\p{Script=Cyrillic}/u, 'ru'],    // all Cyrillic → Russian by default
  [/\p{Script=Greek}/u, 'el'],       // Greek
  [/\p{Script=Hebrew}/u, 'he'],      // Hebrew
  [/\p{Script=Arabic}/u, 'ar'],      // Arabic (incl. Persian, Urdu — Arabic by default)
  [/\p{Script=Armenian}/u, 'hy'],    // Armenian
  [/\p{Script=Georgian}/u, 'ka'],    // Georgian
  [/\p{Script=Hangul}/u, 'ko'],      // Korean (Hangul)
  [/\p{Script=Hiragana}|\p{Script=Katakana}/u, 'ja'], // Japanese: kana
  [/\p{Script=Han}/u, 'zh'],         // Chinese: Han ideographs (after kana, else Japanese falls into zh)
  [/\p{Script=Latin}/u, 'en'],       // Latin → English by default

  // ——— other common scripts ———
  // Here we simply map a script to its most likely "representative" language.
  // Real multilingual detection requires a library (franc, cld3, etc.).
  [/\p{Script=Devanagari}/u, 'hi'],  // Devanagari → Hindi
  [/\p{Script=Bengali}/u, 'bn'],     // Bengali
  [/\p{Script=Gurmukhi}/u, 'pa'],    // Gurmukhi → Punjabi
  [/\p{Script=Gujarati}/u, 'gu'],    // Gujarati
  [/\p{Script=Oriya}/u, 'or'],       // Odia
  [/\p{Script=Tamil}/u, 'ta'],       // Tamil
  [/\p{Script=Telugu}/u, 'te'],      // Telugu
  [/\p{Script=Kannada}/u, 'kn'],     // Kannada
  [/\p{Script=Malayalam}/u, 'ml'],   // Malayalam
  [/\p{Script=Sinhala}/u, 'si'],     // Sinhala
  [/\p{Script=Thai}/u, 'th'],        // Thai
  [/\p{Script=Lao}/u, 'lo'],         // Lao
  [/\p{Script=Tibetan}/u, 'bo'],     // Tibetan
  [/\p{Script=Myanmar}/u, 'my'],     // Burmese
  [/\p{Script=Khmer}/u, 'km'],       // Khmer
  [/\p{Script=Mongolian}/u, 'mn'],   // Mongolian
  [/\p{Script=Ethiopic}/u, 'am'],    // Ethiopic → Amharic
  [/\p{Script=Cherokee}/u, 'chr'],   // Cherokee
  [/\p{Script=Canadian_Aboriginal}/u, 'iu'], // Canadian syllabics → Inuktitut
  [/\p{Script=Thaana}/u, 'dv'],      // Thaana → Dhivehi
  [/\p{Script=Syriac}/u, 'syr'],     // Syriac
  [/\p{Script=Nko}/u, 'nqo'],        // N'Ko
  [/\p{Script=Samaritan}/u, 'smp'],  // Samaritan
  [/\p{Script=Mandaic}/u, 'mid'],    // Mandaic
  [/\p{Script=Yi}/u, 'ii'],          // Yi (Nuosu)
  [/\p{Script=Vai}/u, 'vai'],        // Vai
  [/\p{Script=Bamum}/u, 'bax'],      // Bamum
  [/\p{Script=Osage}/u, 'osa'],      // Osage
  [/\p{Script=Tifinagh}/u, 'tzm'],   // Tifinagh → Tamazight
  [/\p{Script=Adlam}/u, 'ff'],       // Adlam → Fula
  [/\p{Script=Ol_Chiki}/u, 'sat'],   // Ol Chiki → Santali
  [/\p{Script=Saurashtra}/u, 'saz'], // Saurashtra
  [/\p{Script=Meetei_Mayek}/u, 'mni'], // Meitei Mayek → Manipuri
  [/\p{Script=Lepcha}/u, 'lep'],     // Lepcha
  [/\p{Script=Limbu}/u, 'lif'],      // Limbu
  [/\p{Script=New_Tai_Lue}/u, 'khb'],// New Tai Lue
  [/\p{Script=Tai_Le}/u, 'tdd'],     // Tai Le
  [/\p{Script=Tai_Tham}/u, 'lcp'],   // Tai Tham
  [/\p{Script=Tai_Viet}/u, 'blt'],   // Tai Viet
  [/\p{Script=Javanese}/u, 'jv'],    // Javanese
  [/\p{Script=Sundanese}/u, 'su'],   // Sundanese
  [/\p{Script=Balinese}/u, 'ban'],   // Balinese
  [/\p{Script=Batak}/u, 'btk'],      // Batak
  [/\p{Script=Buhid}/u, 'bku'],      // Buhid
  [/\p{Script=Hanunoo}/u, 'hnn'],    // Hanunoo
  [/\p{Script=Tagalog}/u, 'tl'],     // Tagalog (Baybayin)
  [/\p{Script=Tagbanwa}/u, 'tbw'],   // Tagbanwa
  [/\p{Script=Buginese}/u, 'bug'],   // Buginese
  [/\p{Script=Rejang}/u, 'rej'],     // Rejang
  [/\p{Script=Cham}/u, 'cja'],       // Cham
  [/\p{Script=Kayah_Li}/u, 'kyu'],   // Kayah Li
  [/\p{Script=Kharoshthi}/u, 'kho'], // Kharoshthi
  [/\p{Script=Brahmi}/u, 'bra'],     // Brahmi
  [/\p{Script=Kaithi}/u, 'bho'],     // Kaithi → Bhojpuri
  [/\p{Script=Sharada}/u, 'sa'],     // Sharada → Sanskrit
  [/\p{Script=Syloti_Nagri}/u, 'syl'], // Syloti Nagri
  [/\p{Script=Khojki}/u, 'sd'],      // Khojki → Sindhi
  [/\p{Script=Multani}/u, 'skr'],    // Multani → Saraiki
  [/\p{Script=Modi}/u, 'mr'],        // Modi → Marathi
  [/\p{Script=Takri}/u, 'doi'],      // Takri → Dogri
  [/\p{Script=Ahom}/u, 'aho'],       // Ahom
  [/\p{Script=Dogra}/u, 'doi'],      // Dogra
  [/\p{Script=Gunjala_Gondi}/u, 'gon'], // Gunjala Gondi
  [/\p{Script=Masaram_Gondi}/u, 'gon'], // Masaram Gondi
  [/\p{Script=Hanifi_Rohingya}/u, 'rhg'], // Hanifi Rohingya
  [/\p{Script=Sogdian}/u, 'sog'],    // Sogdian
  [/\p{Script=Old_Sogdian}/u, 'sog'],// Old Sogdian
  [/\p{Script=Elymaic}/u, 'ely'],    // Elymaic
  [/\p{Script=Nandinagari}/u, 'sa'], // Nandinagari
  [/\p{Script=Wancho}/u, 'nnp'],     // Wancho
  [/\p{Script=Chorasmian}/u, 'chw'], // Chorasmian
  [/\p{Script=Yezidi}/u, 'ku'],      // Yezidi → Kurdish
  [/\p{Script=Old_Uyghur}/u, 'ug'],  // Old Uyghur
  [/\p{Script=Cypro_Minoan}/u, 'grc'], // Cypro-Minoan → Ancient Greek
  [/\p{Script=Tangsa}/u, 'nst'],     // Tangsa
  [/\p{Script=Toto}/u, 'txo'],       // Toto
  [/\p{Script=Vithkuqi}/u, 'art'],   // Vithkuqi (constructed)
  [/\p{Script=Kawi}/u, 'kaw'],       // Kawi
  [/\p{Script=Nag_Mundari}/u, 'unr'],// Nag Mundari
];

// Returns a language code for a single character, or null if nothing matched.
// .find() takes the first matching regex → order in SCRIPT is critical.
const langByChar = c => (SCRIPT.find(([re]) => re.test(c)) ?? [])[1] ?? null;

// Normalizes a locale to its "base" form: "ru-RU" → "ru", "en_US" → "en".
// Lowercase + drop everything after the first dash/underscore.
const norm = s => String(s).toLowerCase().split(/[-_]/)[0];

// ─── Parse a layout string into { base, shift } ───
// Four input formats are supported:
//   1) string with "|" separator: "йцу…|ЙЦУ…"
//   2) string without "|":        "йцу…"  → shift is derived via toUpperCase()
//   3) array [base, shift] (shift optional)
//   4) object { base, shift } or { lower, upper } (synonyms)
function parseLayout(value, locale) {
  let base, shift;

  if (typeof value === 'string') {
    if (value.includes('|')) {
      // Format "base|shift" — split strictly into two parts.
      [base, shift] = value.split('|', 2);
    } else {
      // Only base — derive shift via toUpperCase().
      base = value;
      shift = value.toUpperCase();
    }
  } else if (Array.isArray(value)) {
    // [base, shift] — shift may be omitted.
    [base, shift = base.toUpperCase()] = value;
  } else if (value && typeof value === 'object') {
    // Object: accept different field names for convenience.
    base  = value.base  ?? value.lower ?? '';
    shift = value.shift ?? value.upper ?? base.toUpperCase();
  } else {
    throw new Error(`Layout "${locale}": unsupported value type`);
  }

  // CRITICAL: base and shift must be the same length, otherwise indexOf()
  // during conversion returns an index that doesn't exist in the second row,
  // and we get a "shifted" result or garbage.
  if (base.length !== shift.length) {
    throw new Error(
      `Layout "${locale}": base length (${base.length}) does not match shift length (${shift.length})`
    );
  }
  if (!base.length) throw new Error(`Layout "${locale}": empty string`);
  return { base, shift, length: base.length };
}

// Verifies two layouts are compatible with each other.
// Compatibility = same length: the physical key order is identical,
// so we can reindex characters one-to-one.
function assertCompatible(a, b) {
  if (a.length !== b.length) {
    throw new Error(
      `Incompatible layouts: length ${a.length} does not match ${b.length}. ` +
      `All layouts must use the same physical key order.`
    );
  }
}

// ─── Decide whether we got a "bundle" (multiple locales) or a single layout ───
// A bundle is an object like { "ru": "...", "en": [...] }, where values are
// strings/arrays/layout objects. If locale is passed explicitly, we treat it
// as a single layout, not a bundle.
function isBundle(json, locale) {
  if (json == null || typeof json !== 'object') return false;
  if (locale != null) return false;                        // explicit locale ⇒ single layout
  if (Array.isArray(json)) return false;                   // array ⇒ single layout
  if ('base' in json || 'shift' in json || 'lower' in json || 'upper' in json) return false; // already a layout
  // Otherwise — a bundle, if ALL values look like layouts.
  return Object.values(json).every(v =>
    typeof v === 'string' || Array.isArray(v)
    || (v && typeof v === 'object' && ('base' in v || 'shift' in v))
  );
}

// ─── Main class ───
export default class KeysWar {
  #layouts = new Map();     // locale → { base, shift, length }
  #order   = [];            // registration order of locales (matters for next())
  #pending = [];            // array of promises from add() — awaited via ready()/then

  /**
   * add(pathOrJson, locale?)
   *   add('/layouts/all.json')            → bundle, registers all locales inside
   *   add('/layouts/ru.json', 'ru')       → single locale, explicit
   *   add('/layouts/ru.json')             → single locale, language from filename
   *   add({ 'ru': '...', 'en': '...' })   → bundle object
   *   add('йцу...|ЙЦУ...', 'ru')          → inline layout
   *
   * Returns this (chainable) and does NOT await loading —
   * work is deferred into #pending.
   */
  add(src, locale) {
    // Wrap all work in an async IIFE and push the promise onto the queue.
    const job = (async () => {
      let json = src;
      let loc  = locale ?? null;

      // If the string looks like a path/URL — fetch the JSON.
      if (typeof src === 'string' && /^(https?:|\/|\.\/|\.\.\/)/.test(src)) {
        const r = await fetch(src);
        if (!r.ok) throw new Error(`Failed to load "${src}": HTTP ${r.status}`);
        json = await r.json();
        // Try to extract the locale from the filename, e.g. "ru.json" → "ru".
        if (!loc) {
          const m = src.match(/([a-z]{2,3}(?:[-_][a-z0-9]{2,4})*)\.json$/i);
          if (m) loc = m[1];
        }
      }

      if (isBundle(json, loc)) {
        // Bundle: iterate over all keys, register each.
        for (const [k, v] of Object.entries(json)) {
          this.#register(norm(k), parseLayout(v, k));
        }
      } else {
        // Single layout: locale is required.
        if (!loc) {
          throw new Error(
            'Cannot determine locale: pass it explicitly, e.g. add("/layouts/xx.json", "xx")'
          );
        }
        this.#register(norm(loc), parseLayout(json, loc));
      }
    })();
    this.#pending.push(job);
    return this;
  }

  // Internal registration: check compatibility with everything already added,
  // store in the Map, and remember the order.
  #register(loc, layout) {
    for (const [, l] of this.#layouts) {
      assertCompatible(layout, l);
    }
    this.#layouts.set(loc, layout);
    if (!this.#order.includes(loc)) this.#order.push(loc);
  }

  // Await loading of all add() calls. Returns a promise.
  ready() { return Promise.all(this.#pending); }

  /** keyswar.strike("ghbdtn").to("ru") — entry point for a single conversion */
  strike(text) { return new Mission(text, this); }

  // Mini-API for Mission (private fields are not accessible from outside).
  _get(l)  { return this.#layouts.get(norm(l)); }
  _has(l)  { return this.#layouts.has(norm(l)); }
  _order() { return [...this.#order]; }
  _wait()  { return Promise.all(this.#pending); }
}

// ─── Mission: the chain for a single conversion ───
class Mission {
  #text; #keyswar;
  #from = null; #to = null;   // explicitly specified locales
  #mode = 'auto';             // 'auto' | 'to' | 'next'

  constructor(text, keyswar) {
    this.#text = String(text);
    this.#keyswar = keyswar;
  }

  // Specify the source locale manually.
  from(locale) { this.#from = norm(locale); return this; }
  // Specify the target locale (and remember mode 'to').
  to(locale)   { this.#to   = norm(locale); this.#mode = 'to';   return this; }
  // Mode "next layout in registration order".
  next()       { this.#mode = 'next'; return this; }
  // Mode "auto-detect source" (default).
  auto()       { this.#mode = 'auto'; return this; }

  // Main logic. Returns a promise with a string.
  // Implementing then()/catch()/finally() makes the object "thenable",
  // so you can write: await keyswar.strike("ghbdtn").to("ru")
  async #execute() {
    await this.#keyswar._wait();               // await all add()
    const order = this.#keyswar._order();
    if (!order.length) throw new Error('No layouts registered');

    // Source: explicit from, or auto-detect by the first "speaking" character.
    let from = this.#from ?? langByChar(this.#text);
    if (!from) throw new Error('Could not detect source language');
    // If detection yielded an unregistered locale — fall back to 'en' if present.
    if (!this.#keyswar._has(from)) {
      if (this.#keyswar._has('en')) from = 'en';
      else throw new Error(`No layout registered for "${from}"`);
    }

    // Target locale: either explicit to, or the next one in a circle (modes 'to' without to, and 'next').
    let to = this.#to;
    if (this.#mode === 'next' || !to) {
      const i = order.indexOf(from);
      if (i === -1) throw new Error(`"${from}" is not registered`);
      to = order[(i + 1) % order.length];
    }
    if (!this.#keyswar._has(to)) throw new Error(`No layout registered for "${to}"`);

    return convert(this.#text, this.#keyswar._get(from), this.#keyswar._get(to));
  }

  // Implement a Promise-like interface so Mission can be awaited.
  then(ok, err) { return this.#execute().then(ok, err); }
  catch(err)    { return this.#execute().catch(err); }
  finally(fn)   { return this.#execute().finally(fn); }
}

// ─── Actual conversion by indices ───
// Idea: we have a "physical key order". For each character of the source
// layout we find its index in base or shift. Then we take the character at the
// same index in the corresponding row of the target layout.
// If the character is in neither base nor shift — leave it as is (spaces, punctuation).
function convert(text, src, dst) {
  let out = '';
  for (const ch of text) {         // for..of correctly iterates code points,
                                   // not UTF-16 code units — important for emoji and surrogates
    let i = src.base.indexOf(ch);
    let target = dst.base;
    if (i === -1) {
      i = src.shift.indexOf(ch);
      target = dst.shift;
    }
    out += i === -1 ? ch : (target[i] ?? ch);
  }
  return out;
}