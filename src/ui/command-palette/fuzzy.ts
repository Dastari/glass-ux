/**
 * A small fuzzy matcher for the command palette. Every query term must match, in order,
 * as a subsequence of the text; contiguous runs, word starts and early positions score
 * higher. Returns the matched character indices so the label can highlight them.
 */

export interface FuzzyMatch {
  score: number
  indices: number[]
}

const isBoundary = (text: string, index: number) => {
  if (index === 0) return true
  const before = text.charAt(index - 1)
  const here = text.charAt(index)
  return /[\s\-_./\\:(]/.test(before) || (before === before.toLowerCase() && here !== here.toLowerCase())
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

function matchTerm(term: string, text: string, folded: string): FuzzyMatch | null {
  if (!term) return { score: 0, indices: [] }
  // Contiguous substring: best case. Prefer one that starts a word.
  let best: FuzzyMatch | null = null
  let from = folded.indexOf(term)
  while (from !== -1) {
    const boundary = isBoundary(text, from)
    const score = 100 + term.length * 4 + (from === 0 ? 40 : boundary ? 25 : 0) - from * 0.5
    if (!best || score > best.score) best = { score, indices: Array.from({ length: term.length }, (_, i) => from + i) }
    from = folded.indexOf(term, from + 1)
  }
  if (best) return best

  // Subsequence: walk the text, preferring word starts for each character.
  const indices: number[] = []
  let score = 0
  let position = 0
  for (let i = 0; i < term.length; i++) {
    const char = term.charAt(i)
    let found = -1
    // Look ahead for this character at a word start before settling for any occurrence.
    for (let j = position; j < folded.length; j++) {
      if (folded.charAt(j) === char && isBoundary(text, j)) {
        found = j
        break
      }
    }
    const next = folded.indexOf(char, position)
    if (next === -1) return null
    // Only jump to a word start if it is not far beyond the nearest occurrence.
    if (found === -1 || found - next > 8) found = next
    const previous = indices.at(-1)
    score += 2
    if (previous !== undefined && found === previous + 1) score += 6
    if (isBoundary(text, found)) score += 8
    if (previous !== undefined) score -= Math.min(found - previous - 1, 6) * 0.5
    indices.push(found)
    position = found + 1
  }
  return { score, indices }
}

/** Score `text` against a whitespace-separated query. `null` when any term does not match. */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return { score: 0, indices: [] }
  const folded = fold(text)
  let score = 0
  const indices = new Set<number>()
  for (const term of terms) {
    const match = matchTerm(term, text, folded)
    if (!match) return null
    score += match.score
    for (const index of match.indices) indices.add(index)
  }
  return { score, indices: [...indices].toSorted((a, b) => a - b) }
}

/**
 * Score a record with several fields. Each term may match any field; the label counts
 * most. Returns the label's indices for highlighting.
 */
export function fuzzyMatchFields(query: string, label: string, others: readonly string[]): FuzzyMatch | null {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return { score: 0, indices: [] }
  const foldedLabel = fold(label)
  const foldedOthers = others.map(fold)
  let score = 0
  const indices = new Set<number>()
  for (const term of terms) {
    const onLabel = matchTerm(term, label, foldedLabel)
    let bestOther = 0
    others.forEach((text, i) => {
      const match = matchTerm(term, text, foldedOthers[i] ?? "")
      if (match) bestOther = Math.max(bestOther, match.score * 0.7)
    })
    if (!onLabel && !bestOther) return null
    if (onLabel && onLabel.score >= bestOther) {
      score += onLabel.score
      for (const index of onLabel.indices) indices.add(index)
    } else {
      score += bestOther
    }
  }
  return { score, indices: [...indices].toSorted((a, b) => a - b) }
}

/** Split text into plain and matched runs for rendering. */
export function highlightRuns(text: string, indices: readonly number[]): Array<{ text: string; match: boolean }> {
  if (!indices.length) return [{ text, match: false }]
  const set = new Set(indices)
  const runs: Array<{ text: string; match: boolean }> = []
  for (let i = 0; i < text.length; i++) {
    const match = set.has(i)
    const last = runs.at(-1)
    if (last && last.match === match) last.text += text.charAt(i)
    else runs.push({ text: text.charAt(i), match })
  }
  return runs
}
