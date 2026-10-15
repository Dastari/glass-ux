/** Shared insertion, rendering and activation policy. It does not validate host business rules. */
const hasControls = (value: string) =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 32 || (code >= 127 && code <= 159);
  });

export function isSafeRichTextUrl(value: string, image = false): boolean {
  // Browsers repair several malformed URLs. Require explicit, unambiguous input instead.
  if (
    !value ||
    /\s/u.test(value) ||
    hasControls(value) ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?![\da-f]{2})/i.test(value)
  )
    return false;
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(value)?.[1]?.toLowerCase();
  try {
    if (!scheme) {
      // A colon in the first path segment denotes a scheme, even if it is malformed.
      if (value.split(/[/?#]/, 1)[0]?.includes(":")) return false;
      return (
        new URL(value, "https://glass-ux.invalid/").origin ===
        "https://glass-ux.invalid"
      );
    }
    const parsed = new URL(value);
    if (scheme === "https" || scheme === "http")
      return /^https?:\/\/[^/?#]+/i.test(value) && Boolean(parsed.hostname);
    if (image) return false;
    if (scheme === "mailto") {
      const recipients = decodeURIComponent(parsed.pathname);
      return (
        !parsed.hash &&
        !hasControls(recipients) &&
        !/\s/u.test(recipients) &&
        (recipients
          ? recipients
              .split(",")
              .every((address) => /^[^@/?#]+@[^@/?#]+$/.test(address))
          : Boolean(parsed.search))
      );
    }
    if (scheme === "tel") {
      const phone = decodeURIComponent(parsed.pathname);
      return (
        !parsed.search &&
        !parsed.hash &&
        /^\+?[\d().*-]+(?:;[a-z\d-]+=[a-z\d+().-]+)*$/i.test(phone) &&
        /\d/.test(phone.split(";", 1)[0] ?? "")
      );
    }
    return false;
  } catch {
    return false;
  }
}

/** Explicit editor navigation always opens separately, with no opener or referrer access. */
export function openRichTextLink(url: string): void {
  if (isSafeRichTextUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
}
