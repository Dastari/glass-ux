/** The URI arithmetic a browser needs, on the contract's `scheme://authority/path` strings. */

/** One place on the way to a URI. */
export interface UriStep {
  uri: string
  name: string
}

/** A location's root: its own, or `${scheme}:///`. */
export const rootUri = (provider: { scheme: string; root?: string }): string => provider.root ?? `${provider.scheme}:///`

/** The URI without a trailing slash, so two spellings of one folder compare equal. */
export const trimUri = (uri: string): string => uri.replace(/\/+$/, "")

/** The scheme of a URI, or null when it has none. */
export function uriScheme(uri: string): string | null {
  return /^([a-z][a-z\d+.-]*):/i.exec(uri)?.[1] ?? null
}

/** The child of a folder. */
export const childUri = (folder: string, name: string): string => `${folder.endsWith("/") ? folder : `${folder}/`}${encodeURIComponent(name)}`

/** The name a URI's last segment reads as. */
export function uriName(uri: string): string {
  const segment = trimUri(uri).split("/").pop() ?? ""
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** The folder holding a URI, or null at the root and outside it. */
export function parentUri(uri: string, root: string): string | null {
  const at = trimUri(uri)
  const top = trimUri(root)
  if (at === top || !at.startsWith(`${top}/`)) return null
  const parent = trimUri(at.slice(0, at.lastIndexOf("/")))
  return parent.length <= top.length ? root : parent
}

/** Every place from the root down to a URI, the URI last. */
export function uriTrail(uri: string, root: string): UriStep[] {
  const trail: UriStep[] = []
  for (let at: string | null = uri; at !== null; at = parentUri(at, root)) trail.unshift({ uri: at, name: uriName(at) })
  return trail
}
