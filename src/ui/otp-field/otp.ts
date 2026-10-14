/**
 * One-time codes as people paste them: "123 456", "123-456", "G-123456" (Google's SMS
 * prefix), "Your code is 123456". OtpInput reads a paste through this, so it fills every box
 * with just the code.
 */

export type OtpCharacters = "numeric" | "alphanumeric"

/**
 * The code inside pasted or typed text, at most `length` characters:
 *   1. a single word that is exactly a code ("Your code is 123456" → 123456);
 *   2. short groups that make one code together ("123 456", "ABC-DEF", "12 34 56");
 *   3. otherwise every code character, in order, cut to length.
 */
export function normaliseOtp(text: string, length: number, characters: OtpCharacters = "numeric"): string {
  const codeChar = characters === "numeric" ? /^\d$/ : /^[a-z0-9]$/i
  const isCode = (token: string) => token.length > 0 && [...token].every((char) => codeChar.test(char))
  const finish = (value: string) => (characters === "alphanumeric" ? value.toUpperCase() : value).slice(0, length)
  const source = text.trim().replace(/^g-(?=\d)/i, "")
  const tokens = source.split(/[\s-]+/).map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))

  const single = tokens.filter((token) => token.length === length && isCode(token))
  // Alphanumeric: a word with a digit is likelier the code than an ordinary word.
  const pick = single.find((token) => /\d/.test(token)) ?? single[0]
  if (pick) return finish(pick)

  for (let start = 0; start < tokens.length; start++) {
    let joined = ""
    for (let end = start; end < tokens.length; end++) {
      const token = tokens[end] ?? ""
      if (!isCode(token) || token.length > 4) break
      joined += token
      if (joined.length === length) return finish(joined)
      if (joined.length > length) break
    }
  }
  return finish([...source].filter((char) => codeChar.test(char)).join(""))
}

/** True when the value is a complete code. */
export const isCompleteOtp = (value: string, length: number, characters: OtpCharacters = "numeric") =>
  value.length === length && (characters === "numeric" ? /^\d+$/ : /^[A-Z0-9]+$/i).test(value)
