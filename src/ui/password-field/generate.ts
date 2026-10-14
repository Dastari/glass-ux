/**
 * Generate passwords with the platform's cryptographic random source
 * (crypto.getRandomValues), uniformly: rejection sampling, so no character is likelier than
 * another. Every class asked for appears at least once.
 */

export interface GenerateOptions {
  /** Default 20. */
  length?: number
  lower?: boolean
  upper?: boolean
  digits?: boolean
  symbols?: boolean
  /** Leave out characters that read alike (I l 1 O 0), for passwords read aloud or typed from paper. Default true. */
  unambiguous?: boolean
}

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  // Symbols that survive shells, CSV, URLs and most password rules.
  symbols: "!#%*+-=?@^_~",
}
const AMBIGUOUS = /[Il1O0o]/g

export type RandomSource = (array: Uint32Array<ArrayBuffer>) => Uint32Array<ArrayBuffer>

const defaultRandom: RandomSource = (array) => crypto.getRandomValues(array)

/** A uniform random integer in [0, max). */
function randomBelow(max: number, random: RandomSource): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buffer = new Uint32Array(1)
  for (;;) {
    random(buffer)
    const value = buffer[0] ?? 0
    if (value < limit) return value % max
  }
}

export function generatePassword(options: GenerateOptions = {}, random: RandomSource = defaultRandom): string {
  const unambiguous = options.unambiguous ?? true
  const chosen = (Object.keys(SETS) as Array<keyof typeof SETS>)
    .filter((key) => options[key] ?? true)
    .map((key) => (unambiguous ? SETS[key].replace(AMBIGUOUS, "") : SETS[key]))
  if (!chosen.length) throw new Error("generatePassword: choose at least one character set")
  const length = Math.max(options.length ?? 20, chosen.length)
  const pool = chosen.join("")
  const characters = chosen.map((set) => set[randomBelow(set.length, random)] ?? "")
  while (characters.length < length) characters.push(pool[randomBelow(pool.length, random)] ?? "")
  // Shuffle (Fisher–Yates), so the guaranteed characters are not always first.
  for (let index = characters.length - 1; index > 0; index--) {
    const swap = randomBelow(index + 1, random)
    ;[characters[index], characters[swap]] = [characters[swap] ?? "", characters[index] ?? ""]
  }
  return characters.join("")
}
