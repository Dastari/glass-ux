/**
 * Composition engines for the on-screen keyboard. Stateless: each works from the character
 * before the caret and returns what replaces it.
 *
 * Hangul (dubeolsik, the 2-set layout): consonant and vowel jamo join into syllables, with
 * compound vowels (ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ), compound finals (ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ) and a
 * final consonant moving to the next syllable when a vowel follows (각 + ㅏ → 가가).
 *
 * Kana: the voicing mark (゛), the semi-voicing mark (゜) and the small form toggle on the
 * kana before the caret.
 */

const SYLLABLE_BASE = 0xac00
const SYLLABLE_LAST = 0xd7a3
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
const MEDIALS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
// Index 0 is "no final"; a space keeps the string aligned with the Unicode order.
const FINALS = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"

const COMPOUND_VOWELS: Record<string, string> = {
  "ㅗㅏ": "ㅘ",
  "ㅗㅐ": "ㅙ",
  "ㅗㅣ": "ㅚ",
  "ㅘㅣ": "ㅙ",
  "ㅜㅓ": "ㅝ",
  "ㅜㅔ": "ㅞ",
  "ㅜㅣ": "ㅟ",
  "ㅝㅣ": "ㅞ",
  "ㅡㅣ": "ㅢ",
}
const COMPOUND_FINALS: Record<string, string> = {
  "ㄱㅅ": "ㄳ",
  "ㄴㅈ": "ㄵ",
  "ㄴㅎ": "ㄶ",
  "ㄹㄱ": "ㄺ",
  "ㄹㅁ": "ㄻ",
  "ㄹㅂ": "ㄼ",
  "ㄹㅅ": "ㄽ",
  "ㄹㅌ": "ㄾ",
  "ㄹㅍ": "ㄿ",
  "ㄹㅎ": "ㅀ",
  "ㅂㅅ": "ㅄ",
}
// The reverse tables: what a compound splits into, for backspace and for moving a final on.
const SPLIT_VOWELS: Record<string, string> = { "ㅘ": "ㅗ", "ㅙ": "ㅘ", "ㅚ": "ㅗ", "ㅝ": "ㅜ", "ㅞ": "ㅝ", "ㅟ": "ㅜ", "ㅢ": "ㅡ" }
const SPLIT_FINALS: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(COMPOUND_FINALS).map(([pair, compound]) => [compound, [pair[0] ?? "", pair[1] ?? ""]]),
)

interface Syllable {
  initial: string
  medial: string
  final: string
}

const isVowel = (jamo: string) => MEDIALS.includes(jamo) && jamo.length === 1
const isConsonant = (jamo: string) => INITIALS.includes(jamo) || FINALS.slice(1).includes(jamo)

function decompose(char: string): Syllable | null {
  const code = char.codePointAt(0) ?? 0
  if (char.length !== 1 || code < SYLLABLE_BASE || code > SYLLABLE_LAST) return null
  const offset = code - SYLLABLE_BASE
  return {
    initial: INITIALS[Math.floor(offset / 588)] ?? "",
    medial: MEDIALS[Math.floor((offset % 588) / 28)] ?? "",
    final: offset % 28 ? (FINALS[offset % 28] ?? "") : "",
  }
}

function compose({ initial, medial, final }: Syllable): string {
  const i = INITIALS.indexOf(initial)
  const m = MEDIALS.indexOf(medial)
  const f = final ? FINALS.indexOf(final) : 0
  if (i < 0 || m < 0 || f < 0) return initial + medial + final
  return String.fromCharCode(SYLLABLE_BASE + (i * 21 + m) * 28 + f)
}

/**
 * Type a jamo after `previous` (the character before the caret, or ""). Returns the text
 * that replaces `previous`: `previous + jamo` when they do not join.
 * @example hangulInput("가", "ㄱ") === "각"; hangulInput("각", "ㅏ") === "가가"
 */
export function hangulInput(previous: string, jamo: string): string {
  const syllable = decompose(previous)
  if (isVowel(jamo)) {
    // A lone consonant takes the vowel: ㄱ + ㅏ → 가.
    if (INITIALS.includes(previous) && previous.length === 1) return compose({ initial: previous, medial: jamo, final: "" })
    // A lone vowel or a syllable without a final may form a compound vowel: 고 + ㅏ → 과.
    if (isVowel(previous)) return COMPOUND_VOWELS[previous + jamo] ?? previous + jamo
    if (syllable && !syllable.final) {
      const medial = COMPOUND_VOWELS[syllable.medial + jamo]
      return medial ? compose({ ...syllable, medial }) : previous + jamo
    }
    // The final moves to the new syllable: 각 + ㅏ → 가가; 갃 + ㅏ → 각사.
    if (syllable?.final) {
      const split = SPLIT_FINALS[syllable.final]
      const [kept, moved] = split ?? ["", syllable.final]
      if (!INITIALS.includes(moved)) return previous + jamo
      return compose({ ...syllable, final: kept }) + compose({ initial: moved, medial: jamo, final: "" })
    }
    return previous + jamo
  }
  if (isConsonant(jamo) && syllable) {
    // A syllable without a final takes the consonant as its final, when it can be one.
    if (!syllable.final) return FINALS.slice(1).includes(jamo) ? compose({ ...syllable, final: jamo }) : previous + jamo
    const final = COMPOUND_FINALS[syllable.final + jamo]
    if (final) return compose({ ...syllable, final })
  }
  return previous + jamo
}

/**
 * Backspace on a Hangul character while composing: removes its last jamo (각 → 가 → ㄱ,
 * 과 → 고, 갃 → 각). Returns the replacement ("" removes it), or null when `char` is not Hangul.
 */
export function hangulBackspace(char: string): string | null {
  const syllable = decompose(char)
  if (syllable) {
    if (syllable.final) return compose({ ...syllable, final: SPLIT_FINALS[syllable.final]?.[0] ?? "" })
    const medial = SPLIT_VOWELS[syllable.medial]
    return medial ? compose({ ...syllable, medial }) : syllable.initial
  }
  if (SPLIT_VOWELS[char]) return SPLIT_VOWELS[char] ?? ""
  if (isVowel(char) || isConsonant(char)) return ""
  return null
}

/** Whether `text` is a single Hangul jamo or syllable the Hangul engine composes. */
export function isHangul(text: string): boolean {
  return text.length === 1 && (decompose(text) !== null || isVowel(text) || isConsonant(text))
}

// ── kana ─────────────────────────────────────────────────────────────────────

const VOICED = "\u3099"
const SEMI_VOICED = "\u309a"
const SMALL_PAIRS = "あぁいぃうぅえぇおぉつっやゃゆゅよょわゎアァイィウゥエェオォツッヤャユュヨョワヮカヵケヶ"
const SMALL: Record<string, string> = {}
for (let index = 0; index < SMALL_PAIRS.length; index += 2) {
  const big = SMALL_PAIRS[index] ?? ""
  const small = SMALL_PAIRS[index + 1] ?? ""
  SMALL[big] = small
  SMALL[small] = big
}

/** The kana mark keys. */
export type KanaModifier = "dakuten" | "handakuten" | "small"

function withMark(char: string, mark: string): string | null {
  const [base = "", existing] = [...char.normalize("NFD")]
  // The same mark again takes it off: が + ゛ → か.
  if (existing === mark) return base
  const marked = (base + mark).normalize("NFC")
  return [...marked].length === 1 ? marked : null
}

/**
 * Apply a kana mark key to the kana before the caret: か + ゛ → が, が + ゛ → か,
 * は + ゜ → ぱ, ば + ゜ → ぱ, つ + 小 → っ. Returns the replacement, or null when the mark
 * does not apply to `char`.
 */
export function kanaModify(char: string, modifier: KanaModifier): string | null {
  if ([...char].length !== 1) return null
  if (modifier === "small") return SMALL[char] ?? null
  return withMark(char, modifier === "dakuten" ? VOICED : SEMI_VOICED)
}

/** Hiragana as katakana: あ → ア. Other characters are unchanged. */
export function toKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096\u309d\u309e]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60))
}

/** Katakana as hiragana: ア → あ. Other characters are unchanged. */
export function toHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6\u30fd\u30fe]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
}
