/**
 * Where to cut an identifier for middle truncation (R8.4): the tail that must stay
 * visible. Hostnames and paths keep their last segment ("NST-…-C106",
 * "AzureAD\…Rowan"); anything else keeps its last few characters.
 */
export function splitMiddle(text: string, tail?: number): { head: string; tail: string } {
  if (tail !== undefined) {
    const size = Math.max(0, Math.min(text.length, tail))
    return { head: text.slice(0, text.length - size), tail: text.slice(text.length - size) }
  }
  const separator = Math.max(text.lastIndexOf("-"), text.lastIndexOf("\\"), text.lastIndexOf("/"), text.lastIndexOf("."), text.lastIndexOf("_"))
  const segment = separator >= 0 ? text.length - separator : 0
  // Keep the separator with the tail so the ellipsis reads "NST-SE…-C106".
  if (segment >= 3 && segment <= 10 && separator > 0) {
    return { head: text.slice(0, separator), tail: text.slice(separator) }
  }
  const size = Math.min(6, Math.floor(text.length / 3))
  return { head: text.slice(0, text.length - size), tail: text.slice(text.length - size) }
}
