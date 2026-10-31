import { numberSeparators } from "../../lib/locale/intl.js"
import { toKatakana } from "./compose.js"

/**
 * What a key does when pressed.
 *
 *   insert       types `text` (a plain string key is shorthand for an insert key)
 *   backspace    deletes the selection or the character before the caret
 *   space        types a space (or `text`)
 *   enter        the Enter key: submits an input's form, adds a line in a textarea
 *   shift        one-shot Shift; pressed twice quickly, or held, it locks (Caps Lock)
 *   layer        shows another layer of the layout (`layer`: "symbols", "default", …)
 *   layout       the globe key: the next layout in the keyboard's `layouts`
 *   hide         hides the keyboard (shown when the keyboard has an `onHide`)
 *   clear        empties the value
 *   left, right  move the caret one character
 *   dakuten      adds or removes the voicing mark on the kana before the caret (か ⇄ が)
 *   handakuten   adds or removes the semi-voicing mark (は ⇄ ぱ)
 *   small        toggles the small form of the kana before the caret (つ ⇄ っ)
 *   script       switches between the hiragana and katakana layers (`layer`)
 *   gap          an empty cell that keeps the grid's geometry (the blank of a PIN pad)
 */
export type KeyboardKeyAction =
  | "insert"
  | "backspace"
  | "space"
  | "enter"
  | "shift"
  | "layer"
  | "layout"
  | "hide"
  | "clear"
  | "left"
  | "right"
  | "dakuten"
  | "handakuten"
  | "small"
  | "script"
  | "gap"

/** A key described by its action, for anything other than typing a single character. */
export interface KeyboardActionKey {
  /** What the key does. */
  action: KeyboardKeyAction
  /** The text an insert or space key types (".com"). */
  text?: string
  /** The visible label, when it differs from the text or the built-in label ("АБВ" on a letters key). */
  label?: string
  /** The layer a layer or script key shows. */
  layer?: string
  /** Width in key units; default 1. Rows narrower than the widest row are centred. */
  width?: number
  /** A stable identity for the key; keys are otherwise identified by their position. */
  id?: string
  /** Small secondary text under the label ("ABC" on the 2 of a phone pad). */
  hint?: string
}

/** One key: a string types itself; an object describes an action. */
export type KeyboardKey = string | KeyboardActionKey

/** A row of keys, laid out in the row's reading or physical order. */
export type KeyRow = readonly KeyboardKey[]

/**
 * The layers of a layout. `default` is required. `shift` is derived from `default` when
 * absent: single letters take the layout locale's upper case. Other layers are reached by
 * layer keys (`{ action: "layer", layer: "symbols" }`).
 */
export interface KeyboardLayers {
  default: readonly KeyRow[]
  shift?: readonly KeyRow[]
  symbols?: readonly KeyRow[]
  symbols2?: readonly KeyRow[]
  [name: string]: readonly KeyRow[] | undefined
}

/** A keyboard layout: its rows of keys in every layer, its language and how it composes text. */
export interface KeyboardLayout {
  /** A unique identifier ("qwerty", "arabic", or your own). */
  id: string
  /** The endonym shown on the space bar and announced on a layout change ("Deutsch", "العربية"). */
  label: string
  /** BCP 47 tag of the language it types: upper case and the `lang` of the keys. */
  locale: string
  /**
   * `physical`: rows keep their left-to-right geometry in right-to-left documents, as the
   * printed keyboard does (Arabic, Hebrew). `reading`: rows follow the document direction
   * (the alphabet grid, kana).
   */
  arrangement: "physical" | "reading"
  /** The layers, by name. */
  layers: KeyboardLayers
  /** Characters offered by pressing and holding a key, by the key's text: `{ e: ["é", "è"] }`. */
  alternates?: Readonly<Record<string, readonly string[]>>
  /** The composition engine for the text the keys type: Hangul syllables or kana marks. */
  compose?: "hangul" | "kana"
  /** A fixed column count for grid layouts (the alphabet grid, number pads); rows start at the start edge. */
  columns?: number
  /** The keys type secrets (a PIN): pressed keys show no enlarged preview. */
  masked?: boolean
}

/** The identifiers of the built-in layouts in {@link keyboardLayouts}. */
export type BuiltInLayoutId =
  | "alphabet"
  | "qwerty"
  | "qwertz"
  | "azerty"
  | "spanish"
  | "portuguese"
  | "italian"
  | "nordic"
  | "russian"
  | "greek"
  | "arabic"
  | "hebrew"
  | "kana"
  | "hangul"
  | "numeric"
  | "decimal"
  | "pin"
  | "phone"
  | "email"
  | "url"

/** Declare a layout with its type checked. Returns the layout unchanged. */
export function defineKeyboardLayout(layout: KeyboardLayout): KeyboardLayout {
  return layout
}

// ── building blocks ──────────────────────────────────────────────────────────

type Alternates = Record<string, readonly string[]>

const chars = (text: string): string[] => text.split(" ").filter(Boolean)
const alts = (spec: Record<string, string>): Alternates =>
  Object.fromEntries(Object.entries(spec).map(([key, list]) => [key, chars(list)]))

const SYMBOL_ALTERNATES: Alternates = alts({
  "-": "– — ·",
  '"': "“ ” „ « »",
  "'": "‘ ’ ‚ ‹ ›",
  "?": "¿",
  "!": "¡",
  ".": "…",
  "$": "¢ £ € ¥ ₩ ₹",
  "%": "‰",
  "&": "§",
  "/": "\\",
  "=": "≠ ≈",
  "+": "±",
  "*": "★ †",
  "0": "° ⁰",
  "1": "¹ ½ ⅓ ¼",
  "2": "² ⅔",
  "3": "³ ¾",
})

interface LettersOptions {
  id: string
  label: string
  locale: string
  rows: readonly [string, string, string]
  arrangement?: "physical" | "reading"
  alternates?: Alternates
  /** Shift and Caps Lock are offered (scripts with case, and Hangul's double consonants). */
  shift?: boolean
  /** An explicit shift layer's letter rows, in place of the upper-case derivation. */
  shiftRows?: readonly [string, string, string]
  /** The punctuation either side of the space bar. */
  punctuation?: readonly [string, string]
  /** The main currency on the symbols layer. */
  currency?: string
  /** Digits on the symbols layer. */
  digits?: string
  /** Visible labels for the letters and symbols keys, when the script has its own ("АБВ"). */
  lettersLabel?: string
  symbolsLabel?: string
  compose?: "hangul"
  /** Replaces the bottom row's punctuation keys (email, url). */
  bottom?: (units: number) => KeyRow
}

const sum = (row: KeyRow) => row.reduce<number>((total, key) => total + (typeof key === "string" ? 1 : (key.width ?? 1)), 0)

function bottomRow(units: number, layerKey: KeyboardKey, punctuation: readonly [string, string]): KeyRow {
  // ?123 · , · globe · space · . · enter, the space bar takes what the row has left.
  return [layerKey, punctuation[0], { action: "layout" }, { action: "space", width: units - 6 }, punctuation[1], { action: "enter", width: 1.5 }]
}

function lettersLayout(options: LettersOptions): KeyboardLayout {
  const { rows, shift = true, punctuation = [",", "."], currency = "$", digits = "1 2 3 4 5 6 7 8 9 0" } = options
  const [one, two, three] = rows.map(chars) as [string[], string[], string[]]
  const units = Math.max(one.length, two.length, three.length + (shift ? 2 : 1))
  const side = shift ? Math.max(1, (units - three.length) / 2) : Math.max(1, units - three.length)
  const back: KeyboardKey = { action: "backspace", width: side }
  const symbolsKey: KeyboardKey = { action: "layer", layer: "symbols", width: 1.5, label: options.symbolsLabel }
  const lettersKey: KeyboardKey = { action: "layer", layer: "default", width: 1.5, label: options.lettersLabel }
  const letterRows = (first: string[], second: string[], third: string[]): KeyRow[] => [
    first,
    second,
    shift ? [{ action: "shift", width: side }, ...third, back] : [...third, back],
    options.bottom?.(units) ?? bottomRow(units, symbolsKey, punctuation),
  ]
  const symbolSide = (units - 7) / 2
  const symbolBottom = (key: KeyboardKey) => options.bottom ? [key, ...options.bottom(units).slice(1)] : bottomRow(units, key, punctuation)
  const layers: KeyboardLayers = {
    default: letterRows(one, two, three),
    symbols: [
      chars(digits),
      chars(`@ # ${currency} _ & - + ( ) /`),
      [{ action: "layer", layer: "symbols2", width: symbolSide }, ...chars(`* " ' : ; ! ?`), { action: "backspace", width: symbolSide }],
      symbolBottom(lettersKey),
    ],
    symbols2: [
      chars("~ ` | • √ π ÷ × § ¶"),
      chars("£ € ¥ ^ ° = { } [ ]"),
      [{ action: "layer", layer: "symbols", width: symbolSide, label: options.symbolsLabel }, ...chars("\\ % © ® ™ < >"), { action: "backspace", width: symbolSide }],
      symbolBottom(lettersKey),
    ],
  }
  if (options.shiftRows) {
    const [a, b, c] = options.shiftRows.map(chars) as [string[], string[], string[]]
    layers.shift = letterRows(a, b, c)
  }
  return {
    id: options.id,
    label: options.label,
    locale: options.locale,
    arrangement: options.arrangement ?? "physical",
    layers,
    alternates: { ...SYMBOL_ALTERNATES, ...options.alternates },
    ...(options.compose ? { compose: options.compose } : {}),
  }
}

// Accents offered by press and hold, in the order each language's platform keyboards list them.
const LATIN = alts({
  a: "à á â ä æ ã å ā",
  c: "ç ć č",
  e: "è é ê ë ē ė ę",
  i: "î ï í ī į ì",
  n: "ñ ń",
  o: "ô ö ò ó œ ø ō õ",
  s: "ß ś š",
  u: "û ü ù ú ū",
  y: "ÿ",
  z: "ž ź ż",
})
const ACCENTS: Record<string, Alternates> = {
  en: LATIN,
  de: { ...LATIN, ...alts({ a: "ä à á â æ ã å ā", o: "ö ô ò ó œ ø ō õ", u: "ü û ù ú ū", e: "é è ê ë ė", ä: "à á â æ", ö: "ô ò ó œ ø", ü: "û ù ú" }) },
  fr: { ...LATIN, ...alts({ e: "é è ê ë ē ė ę", a: "à â æ á ä ã å ā", i: "î ï ì í į ī", o: "ô œ ö ò ó õ ø ō", u: "ù û ü ú ū" }) },
  es: { ...LATIN, ...alts({ a: "á à ä â ã å ą æ ā ª", e: "é è ë ê ę ė ē", i: "í ï ì î į ī", o: "ó ò ö ô õ ø œ ō º", u: "ú ü ù û ū", n: "ñ ń", ñ: "ń" }) },
  pt: { ...LATIN, ...alts({ a: "á à â ã ä å æ ª", e: "é ê è ë ē", i: "í î ì ï", o: "ó ô õ ò ö ø œ º", u: "ú ü ù û", ç: "ć č" }) },
  it: { ...LATIN, ...alts({ a: "à á â ä æ ã å ā ª", e: "è é ê ë ę ė ē", i: "ì í î ï į ī", o: "ò ó ô ö õ œ ø ō º", u: "ù ú û ü ū" }) },
  nl: { ...LATIN, ...alts({ e: "é è ë ê ē", i: "ï í ì î", o: "ó ö ô ò", u: "ú ü ù û", a: "á ä à â" }) },
  sv: { ...LATIN, ...alts({ a: "á à â ã ā", o: "ó ò ô õ ø œ ō", e: "é è ê ë", u: "ü ú ù û", ä: "æ", ö: "ø", å: "ā" }) },
}

const RUSSIAN = alts({ е: "ё", ь: "ъ" })
const GREEK = alts({ α: "ά", ε: "έ", η: "ή", ι: "ί ϊ ΐ", ο: "ό", υ: "ύ ϋ ΰ", ω: "ώ" })
const ARABIC = alts({
  ا: "أ إ آ ء",
  ي: "ئ ى",
  و: "ؤ",
  ه: "ة",
  "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "٠": "0",
})

const accentsFor = (locale: string) => ACCENTS[locale.toLowerCase().split("-")[0] ?? "en"] ?? LATIN

const qwerty = (id: string, label: string, locale: string, accents = accentsFor(locale), currency = "$") =>
  lettersLayout({ id, label, locale, rows: ["q w e r t y u i o p", "a s d f g h j k l", "z x c v b n m"], alternates: accents, currency })

const nordic = (id: string, label: string, locale: string, two: string) =>
  lettersLayout({ id, label, locale, rows: ["q w e r t y u i o p å", `a s d f g h j k l ${two}`, "z x c v b n m"], alternates: ACCENTS.sv, currency: "kr" })

const HIRAGANA_ROWS = [
  "あ い う え お は ひ ふ へ ほ",
  "か き く け こ ま み む め も",
  "さ し す せ そ や 「 ゆ 」 よ",
  "た ち つ て と ら り る れ ろ",
  "な に ぬ ね の わ を ん 、 。",
]
function kanaLayout(): KeyboardLayout {
  // The smart-TV gojūon grid: two blocks of five rows, each row read あいうえお in reading order.
  const actions = (script: KeyboardKey): KeyRow => [
    { action: "layer", layer: "symbols", label: "?123" },
    script,
    { action: "small", label: "小" },
    { action: "dakuten", label: "゛" },
    { action: "handakuten", label: "゜" },
    "ー",
    { action: "layout" },
    { action: "space" },
    { action: "backspace" },
    { action: "enter" },
  ]
  const hiragana = HIRAGANA_ROWS.map(chars)
  return {
    id: "kana",
    label: "日本語 かな",
    locale: "ja",
    arrangement: "reading",
    compose: "kana",
    columns: 10,
    layers: {
      default: [...hiragana, actions({ action: "script", layer: "katakana", label: "カナ" })],
      katakana: [...hiragana.map((row) => row.map(toKatakana)), actions({ action: "script", layer: "default", label: "かな" })],
      symbols: [
        chars("1 2 3 4 5 6 7 8 9 0"),
        chars("！ ？ ・ … ～ ＠ ＃ ＆ ＊ ＋"),
        chars("（ ） 『 』 【 】 ＝ ／ ： ￥"),
        chars("ゝ ゞ ヽ ヾ 〃 々 ％ ＿ ＜ ＞"),
        chars("← ↑ ↓ → ○ × △ □ ※ ♪"),
        [{ action: "layer", layer: "default", label: "あいう", width: 2 }, { action: "layout" }, { action: "space", width: 4 }, { action: "backspace", width: 2 }, { action: "enter" }],
      ],
    },
  }
}

const numberPad = (id: string, bottom: KeyRow, extra: Partial<KeyboardLayout> = {}): KeyboardLayout => ({
  id,
  label: "123",
  locale: "en",
  arrangement: "reading",
  columns: 3,
  layers: { default: [chars("1 2 3"), chars("4 5 6"), chars("7 8 9"), bottom] },
  ...extra,
})

/** The decimal pad with the locale's decimal separator ("," in de, "٫" in ar-EG). */
function decimalLayout(locale: string): KeyboardLayout {
  return numberPad("decimal", [numberSeparators(locale).decimal, "0", { action: "backspace" }])
}

// ── alphabet grid ────────────────────────────────────────────────────────────

const ENDONYMS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  sv: "Svenska",
  fi: "Suomi",
  da: "Dansk",
  nb: "Norsk",
  nn: "Norsk",
  no: "Norsk",
  ru: "Русский",
  el: "Ελληνικά",
  ar: "العربية",
  he: "עברית",
  ko: "한국어",
}
const LATIN_LETTERS = "a b c d e f g h i j k l m n o p q r s t u v w x y z"
const ALPHABETS: Record<string, string> = {
  en: LATIN_LETTERS,
  de: `${LATIN_LETTERS} ä ö ü ß`,
  es: "a b c d e f g h i j k l m n ñ o p q r s t u v w x y z",
  sv: `${LATIN_LETTERS} å ä ö`,
  fi: `${LATIN_LETTERS} å ä ö`,
  da: `${LATIN_LETTERS} æ ø å`,
  nb: `${LATIN_LETTERS} æ ø å`,
  nn: `${LATIN_LETTERS} æ ø å`,
  no: `${LATIN_LETTERS} æ ø å`,
  ru: "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я",
  el: "α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω",
  ar: "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي",
  he: "א ב ג ד ה ו ז ח ט י כ ל מ נ ס ע פ צ ק ר ש ת",
  ko: "ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ",
}
const ALPHABET_ACCENTS: Record<string, Alternates> = { ...ACCENTS, ru: RUSSIAN, el: GREEK, ar: ARABIC }

const language = (locale: string) => locale.toLowerCase().split("-")[0] ?? "en"

/**
 * The alphabet grid of search panels on TVs and set-top boxes: a wide Space and a wide
 * Backspace on the top row, then the locale's letters and the digits 0–9 in rows of six,
 * read in the document's direction. English a–z; German adds ä ö ü ß, Spanish ñ, Swedish and
 * Finnish å ä ö, Danish and Norwegian æ ø å; Russian, Greek, Arabic, Hebrew and Korean use
 * their own alphabets (Korean jamo compose into syllables). Japanese returns the kana grid.
 * Other languages get a–z, with the locale's accents on press and hold where known.
 */
export function alphabetLayout(locale: string): KeyboardLayout {
  const lang = language(locale)
  if (lang === "ja") return kanaLayout()
  const tag = ALPHABETS[lang] !== undefined || ENDONYMS[lang] !== undefined ? lang : "en"
  const columns = 6
  const keys = [...chars(ALPHABETS[tag] ?? LATIN_LETTERS), ...chars("1 2 3 4 5 6 7 8 9 0")]
  const rows: KeyRow[] = [[{ action: "space", width: 3 }, { action: "backspace", width: 3 }]]
  for (let index = 0; index < keys.length; index += columns) rows.push(keys.slice(index, index + columns))
  return {
    id: "alphabet",
    label: ENDONYMS[tag] ?? "English",
    locale: tag,
    arrangement: "reading",
    columns,
    layers: { default: rows },
    alternates: ALPHABET_ACCENTS[tag] ?? (ALPHABETS[tag] !== undefined ? undefined : LATIN),
    ...(tag === "ko" ? { compose: "hangul" as const } : {}),
  }
}

// ── the built-in table ───────────────────────────────────────────────────────

const domainBottom = (separator: string) => (units: number): KeyRow => [
  { action: "layer", layer: "symbols", width: 1.5 },
  { action: "layout" },
  separator,
  { action: "space", width: units - 7.5 },
  ".",
  { action: "insert", text: ".com", width: 1.5 },
  { action: "enter", width: 1.5 },
]
const DOMAINS = alts({ ".com": ".net .org .io .co .edu" })

const builders: Record<BuiltInLayoutId, () => KeyboardLayout> = {
  alphabet: () => alphabetLayout("en"),
  qwerty: () => qwerty("qwerty", "English", "en"),
  qwertz: () =>
    lettersLayout({ id: "qwertz", label: "Deutsch", locale: "de", rows: ["q w e r t z u i o p ü", "a s d f g h j k l ö ä", "y x c v b n m"], alternates: ACCENTS.de, currency: "€" }),
  azerty: () =>
    lettersLayout({ id: "azerty", label: "Français", locale: "fr", rows: ["a z e r t y u i o p", "q s d f g h j k l m", "w x c v b n '"], alternates: ACCENTS.fr, currency: "€" }),
  spanish: () =>
    lettersLayout({ id: "spanish", label: "Español", locale: "es", rows: ["q w e r t y u i o p", "a s d f g h j k l ñ", "z x c v b n m"], alternates: ACCENTS.es, currency: "€" }),
  portuguese: () =>
    lettersLayout({ id: "portuguese", label: "Português", locale: "pt", rows: ["q w e r t y u i o p", "a s d f g h j k l ç", "z x c v b n m"], alternates: ACCENTS.pt, currency: "€" }),
  italian: () => qwerty("italian", "Italiano", "it", ACCENTS.it, "€"),
  nordic: () => nordic("nordic", "Svenska", "sv", "ö ä"),
  russian: () =>
    lettersLayout({
      id: "russian",
      label: "Русский",
      locale: "ru",
      rows: ["й ц у к е н г ш щ з х", "ф ы в а п р о л д ж э", "я ч с м и т ь б ю"],
      alternates: RUSSIAN,
      currency: "₽",
      lettersLabel: "АБВ",
    }),
  greek: () =>
    lettersLayout({ id: "greek", label: "Ελληνικά", locale: "el", rows: ["; ς ε ρ τ υ θ ι ο π", "α σ δ φ γ η ξ κ λ", "ζ χ ψ ω β ν μ"], alternates: GREEK, currency: "€", lettersLabel: "ΑΒΓ" }),
  // Arabic 101: the letters on their physical keys; Shift gives the harakat and the hamza forms.
  arabic: () =>
    lettersLayout({
      id: "arabic",
      label: "العربية",
      locale: "ar",
      rows: ["ض ص ث ق ف غ ع ه خ ح ج د", "ش س ي ب ل ا ت ن م ك ط ذ", "ئ ء ؤ ر لا ى ة و ز ظ"],
      shiftRows: ["َ ً ُ ٌ لإ إ ‘ ÷ × ؛ < >", "ِ ٍ ] [ لأ أ ـ ، / : \" ّ", "~ ْ } { لآ آ ’ , . ؟"],
      alternates: ARABIC,
      punctuation: ["،", "."],
      digits: "١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠",
      lettersLabel: "أبج",
      symbolsLabel: "؟١٢٣",
    }),
  // SI-1452: the letters on their physical keys, final forms in place; Hebrew has no case.
  hebrew: () =>
    lettersLayout({
      id: "hebrew",
      label: "עברית",
      locale: "he",
      rows: ["/ ' ק ר א ט ו ן ם פ", "ש ד ג כ ע י ח ל ך ף", "ז ס ב ה נ מ צ ת ץ"],
      shift: false,
      currency: "₪",
      lettersLabel: "אבג",
    }),
  kana: kanaLayout,
  hangul: () =>
    lettersLayout({
      id: "hangul",
      label: "한국어",
      locale: "ko",
      rows: ["ㅂ ㅈ ㄷ ㄱ ㅅ ㅛ ㅕ ㅑ ㅐ ㅔ", "ㅁ ㄴ ㅇ ㄹ ㅎ ㅗ ㅓ ㅏ ㅣ", "ㅋ ㅌ ㅊ ㅍ ㅠ ㅜ ㅡ"],
      shiftRows: ["ㅃ ㅉ ㄸ ㄲ ㅆ ㅛ ㅕ ㅑ ㅒ ㅖ", "ㅁ ㄴ ㅇ ㄹ ㅎ ㅗ ㅓ ㅏ ㅣ", "ㅋ ㅌ ㅊ ㅍ ㅠ ㅜ ㅡ"],
      compose: "hangul",
      currency: "₩",
      lettersLabel: "한글",
    }),
  numeric: () => numberPad("numeric", [{ action: "clear" }, "0", { action: "backspace" }]),
  decimal: () => decimalLayout("en"),
  pin: () => numberPad("pin", [{ action: "gap" }, "0", { action: "backspace" }], { masked: true }),
  phone: () => ({
    ...numberPad("phone", [], {}),
    layers: {
      default: [
        ["1", { action: "insert", text: "2", hint: "ABC" }, { action: "insert", text: "3", hint: "DEF" }],
        [{ action: "insert", text: "4", hint: "GHI" }, { action: "insert", text: "5", hint: "JKL" }, { action: "insert", text: "6", hint: "MNO" }],
        [{ action: "insert", text: "7", hint: "PQRS" }, { action: "insert", text: "8", hint: "TUV" }, { action: "insert", text: "9", hint: "WXYZ" }],
        ["*", { action: "insert", text: "0", hint: "+" }, "#"],
        [{ action: "gap" }, { action: "enter" }, { action: "backspace" }],
      ],
    },
    alternates: { "0": ["+"] },
  }),
  email: () => ({
    ...lettersLayout({ id: "email", label: "English", locale: "en", rows: ["q w e r t y u i o p", "a s d f g h j k l", "z x c v b n m"], alternates: LATIN, bottom: domainBottom("@") }),
    alternates: { ...SYMBOL_ALTERNATES, ...LATIN, ...DOMAINS },
  }),
  url: () => ({
    ...lettersLayout({ id: "url", label: "English", locale: "en", rows: ["q w e r t y u i o p", "a s d f g h j k l", "z x c v b n m"], alternates: LATIN, bottom: domainBottom("/") }),
    alternates: { ...SYMBOL_ALTERNATES, ...LATIN, ...DOMAINS },
  }),
}

/** Build each layout on first access, so layouts nobody reads are never built. */
function lazyLayouts(): Readonly<Record<BuiltInLayoutId, KeyboardLayout>> {
  const built: Partial<Record<BuiltInLayoutId, KeyboardLayout>> = {}
  const table = {} as Record<BuiltInLayoutId, KeyboardLayout>
  for (const id of Object.keys(builders) as BuiltInLayoutId[])
    Object.defineProperty(table, id, { enumerable: true, get: () => (built[id] ??= builders[id]()) })
  return Object.freeze(table)
}

/**
 * The built-in layouts by identifier. Each is built the first time it is read. `decimal`
 * and `alphabet` here are the English forms; the keyboard resolves those two identifiers for
 * its locale (the locale's decimal separator, the locale's alphabet).
 */
export const keyboardLayouts: Readonly<Record<BuiltInLayoutId, KeyboardLayout>> = /* @__PURE__ */ lazyLayouts()

const variants = new Map<string, KeyboardLayout>()
const variant = (key: string, build: () => KeyboardLayout) => {
  let layout = variants.get(key)
  if (!layout) variants.set(key, (layout = build()))
  return layout
}

/**
 * The usual layout for a language: de qwertz, fr azerty, es spanish, pt portuguese, it
 * italian, sv/fi nordic (with Norwegian and Danish forms for nb/nn/no and da), ar arabic,
 * he hebrew, ru russian, el greek, ja kana, ko hangul, otherwise qwerty. Chinese gets qwerty:
 * converting pinyin to characters needs an input method, which is out of scope.
 */
export function layoutForLocale(locale: string): KeyboardLayout {
  const lang = language(locale)
  switch (lang) {
    case "de":
      return keyboardLayouts.qwertz
    case "fr":
      return keyboardLayouts.azerty
    case "es":
      return keyboardLayouts.spanish
    case "pt":
      return keyboardLayouts.portuguese
    case "it":
      return keyboardLayouts.italian
    case "sv":
    case "fi":
      return keyboardLayouts.nordic
    case "nb":
    case "nn":
    case "no":
      return variant("norwegian", () => nordic("norwegian", "Norsk", "nb", "ø æ"))
    case "da":
      return variant("danish", () => nordic("danish", "Dansk", "da", "æ ø"))
    case "ar":
      return keyboardLayouts.arabic
    case "he":
    case "iw":
      return keyboardLayouts.hebrew
    case "ru":
      return keyboardLayouts.russian
    case "el":
      return keyboardLayouts.greek
    case "ja":
      return keyboardLayouts.kana
    case "ko":
      return keyboardLayouts.hangul
    case "nl":
      return variant("dutch", () => qwerty("dutch", "Nederlands", "nl", ACCENTS.nl, "€"))
    default:
      return keyboardLayouts.qwerty
  }
}

/**
 * A layout from a layout or an identifier. `decimal` and `alphabet` follow `locale`; other
 * identifiers return the built-in layout. An unknown identifier falls back to the locale's layout.
 */
export function resolveKeyboardLayout(layout: KeyboardLayout | BuiltInLayoutId | undefined, locale: string): KeyboardLayout {
  if (typeof layout === "object") return layout
  if (layout === "decimal") return variant(`decimal|${numberSeparators(locale).decimal}`, () => decimalLayout(locale))
  if (layout === "alphabet") return variant(`alphabet|${language(locale)}`, () => alphabetLayout(locale))
  if (layout && Object.hasOwn(builders, layout)) return keyboardLayouts[layout]
  return layoutForLocale(locale)
}

// ── reading a layout ─────────────────────────────────────────────────────────

/** A key in its object form, with a width. */
export interface NormalizedKey extends KeyboardActionKey {
  width: number
}

/** A key as an object: a string key becomes an insert key that types it. */
export function normalizeKey(key: KeyboardKey): NormalizedKey {
  if (typeof key === "string") return { action: "insert", text: key, width: 1 }
  return { ...key, width: key.width ?? 1 }
}

const isLetter = (text: string) => /^\p{L}$/u.test(text)

/** The upper case of a single letter in the layout's language, or the text unchanged ("ß" stays). */
export function shiftedText(text: string, locale: string): string {
  if (!isLetter(text)) return text
  const upper = text.toLocaleUpperCase(locale)
  return [...upper].length === 1 ? upper : text
}

/** The rows a layer shows. `shifted` picks the shift layer of the default layer (derived when absent). */
export function layerRows(layout: KeyboardLayout, layer: string, shifted: boolean): readonly KeyRow[] {
  const rows = layout.layers[layer] ?? layout.layers.default
  if (!shifted || layer !== "default") return rows
  if (layout.layers.shift) return layout.layers.shift
  return rows.map((row) => row.map((key) => (typeof key === "string" ? shiftedText(key, layout.locale) : key)))
}

/** The alternates offered for a key's text; an upper-case letter gets its lower case's, in upper case. */
export function alternatesFor(layout: KeyboardLayout, text: string | undefined): readonly string[] {
  if (!text || !layout.alternates) return []
  const own = layout.alternates[text]
  if (own) return own
  const lower = text.toLocaleLowerCase(layout.locale)
  const base = lower !== text ? layout.alternates[lower] : undefined
  return base ? base.map((char) => shiftedText(char, layout.locale)) : []
}

/** Whether a layer of the layout has a key with this action. */
export function hasAction(layout: KeyboardLayout, action: KeyboardKeyAction): boolean {
  return Object.values(layout.layers).some((rows) => rows?.some((row) => row.some((key) => typeof key !== "string" && key.action === action)))
}

/** The width of a row in key units. */
export const rowUnits = sum
