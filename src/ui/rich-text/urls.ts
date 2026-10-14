/** Shared insertion policy. Imported unsafe links retain their source, but Lexical blocks navigation. */
export function isSafeRichTextUrl(value: string, image = false): boolean {
  // Reject hidden controls in URL schemes and whitespace in unencoded URLs.
  if (
    !value ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    ) ||
    value.startsWith("//") ||
    value.startsWith("\\")
  )
    return false;
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(value)?.[1]?.toLowerCase();
  if (scheme)
    return ["https", "http", ...(image ? [] : ["mailto", "tel"])].includes(
      scheme,
    );
  return !value.includes("\\");
}
