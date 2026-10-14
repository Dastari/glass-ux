/**
 * Password strength, estimated in the browser without a dictionary download.
 *
 * Why not zxcvbn-ts: its value is its dictionaries (common passwords, names, English words),
 * about 1.5 MB raw / 400 KB gzipped for the common and English packs. Glass UX's passwords are
 * mostly generated, the server enforces the real policy (and should check breached-password
 * lists), and the meter only has to steer people away from obviously weak choices. This
 * heuristic is about 3 KB: it rewards length and variety, and penalises the patterns that make
 * most weak passwords weak — the commonest passwords (with l33t spellings undone), keyboard
 * runs, sequences, repeats, years and the person's own details.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export interface Strength {
  score: StrengthScore
  /** "Too weak", "Weak", "Fair", "Good", "Strong". */
  label: string
  /** The single most useful next step, or null when it is strong. */
  feedback: string | null
  /** The estimate behind the score, in bits. */
  bits: number
}

export const STRENGTH_LABELS: readonly string[] = ["Too weak", "Weak", "Fair", "Good", "Strong"]

/** The commonest passwords and their stems (lower case, l33t undone). */
const COMMON = new Set(
  (
    "password passw0rd letmein welcome admin administrator root qwerty qwertyuiop asdf asdfgh asdfghjkl zxcvbn " +
    "iloveyou monkey dragon football baseball soccer cricket footy master sunshine princess shadow superman batman " +
    "trustno1 abc123 abcdef abcd1234 hello freedom whatever starwars pokemon charlie michael jennifer jordan " +
    "secret changeme default login guest test tester summer winter autumn spring australia sydney melbourne " +
    "hobart tasmania brisbane perth adelaide canberra aussie kangaroo orbit.example glassUx office company " +
    "computer internet google microsoft windows apple samsung cisco ubiquiti unifi printer server " +
    "p@ssword p@ssw0rd 123456 1234567 12345678 123456789 1234567890 111111 000000 654321 121212 666666 7777777"
  ).split(" ")
)

const KEYBOARD_ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./", "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p"]
const LEET: Readonly<Record<string, string>> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i", "|": "l", "+": "t" }

const unleet = (text: string) => text.replace(/[013457@$!|+8]/g, (char) => LEET[char] ?? char)

/** The character pool a password draws from. */
function poolSize(password: string) {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/\d/.test(password)) pool += 10
  if (/[^a-zA-Z0-9\s]/.test(password)) pool += 33
  if (/\s/.test(password)) pool += 1
  // oxlint-disable-next-line no-control-regex -- anything beyond ASCII widens the pool
  if (/[^\x00-\x7f]/.test(password)) pool += 100
  return Math.max(pool, 1)
}

/** Characters that only repeat or continue a run (abc, 321, qwer, aaaa) add little. */
function patternLength(password: string) {
  const lower = password.toLowerCase()
  let predictable = 0
  for (let index = 1; index < lower.length; index++) {
    const previous = lower.charCodeAt(index - 1)
    const current = lower.charCodeAt(index)
    const repeat = previous === current
    const sequence = Math.abs(current - previous) === 1
    const keyboard = KEYBOARD_ROWS.some((row) => {
      const at = row.indexOf(lower[index - 1] ?? "")
      return at !== -1 && (row[at + 1] === lower[index] || row[at - 1] === lower[index])
    })
    if (repeat || sequence || keyboard) predictable++
  }
  return predictable
}

/** Estimate a password's strength. `userInputs` are the person's own details (name, email, organisation). */
export function estimateStrength(password: string, userInputs: readonly string[] = []): Strength {
  if (!password) return { score: 0, label: STRENGTH_LABELS[0]!, feedback: "Enter a password", bits: 0 }
  const lower = password.toLowerCase()
  // The word inside decorations: "Summer2024!" → summer, "P@ssw0rd1" → p@ssw0rd → password.
  const stem = lower.replace(/^[^a-z@$]+|[^a-z]+$/g, "")
  const digitsOnly = lower.replace(/\D/g, "")
  const result = (score: StrengthScore, feedback: string | null, bits: number): Strength => ({ score, label: STRENGTH_LABELS[score]!, feedback, bits: Math.round(bits) })

  // Effective length: predictable characters count a quarter.
  const predictable = patternLength(password)
  let effective = password.length - predictable * 0.75
  let feedback: string | null = null

  // Common passwords, whole or as the stem ("Password1!", "P@ssw0rd2024").
  const common = (text: string) => COMMON.has(text) || COMMON.has(unleet(text))
  if (common(lower) || (stem.length >= 4 && stem.length >= lower.length - 6 && common(stem))) {
    return result(0, "Avoid common passwords and their variations", 8)
  }
  // The person's own details.
  for (const input of userInputs) {
    for (const part of input.toLowerCase().split(/[^a-z0-9]+/)) {
      if (part.length >= 3 && lower.includes(part)) {
        effective -= part.length * 0.8
        feedback = "Avoid your name, email or organisation"
      }
    }
  }
  // Years (1950–2039) are guessed early.
  if (/(19[5-9]\d|20[0-3]\d)/.test(lower)) {
    effective -= 3
    feedback ??= "Avoid years and dates"
  }
  if (predictable > password.length / 2) feedback ??= "Avoid repeated characters, sequences and keyboard runs"
  if (digitsOnly.length === password.length) feedback ??= "Mix in letters, or use a longer passphrase"

  const bits = Math.max(0, effective) * Math.log2(poolSize(password))
  const score: StrengthScore = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
  if (score >= 4) return result(4, null, bits)
  if (!feedback) feedback = password.length < 12 ? "Use 12 characters or more" : "Add another word or a few more characters"
  return result(score, feedback, bits)
}
