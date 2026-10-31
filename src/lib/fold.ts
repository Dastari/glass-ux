/**
 * Text for case- and accent-insensitive search. No hooks: server components and plain
 * helpers can call it.
 */

// Combining diacritical marks only. Wider classes (\p{M}, \p{Diacritic}) would also strip
// the voiced marks of kana, the vowel signs of Indic scripts and Arabic vowels, which change
// what a word is.
const MARKS = /[̀-ͯ]/g
const ASCII = /^\p{ASCII}*$/u

/**
 * `text` lower-cased in `locale` and stripped of accents, so "Müller" and "muller" fold to
 * the same text. Case follows the language (Turkish "I" becomes "ı", "İ" becomes "i"), so
 * pass the interface locale; without one the root rules apply. Fold the query and the
 * text with the same locale, and fold a query once rather than for every row.
 */
export function foldText(text: string, locale?: string): string {
  const lower = locale ? text.toLocaleLowerCase(locale) : text.toLowerCase()
  // Recomposing keeps a kana or Hangul syllable one character, so indices into the folded text stay indices into the original.
  return ASCII.test(lower) ? lower : lower.normalize("NFD").replace(MARKS, "").normalize("NFC")
}
