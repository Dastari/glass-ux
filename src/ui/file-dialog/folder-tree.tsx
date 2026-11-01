import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FileEntry, FileProvider, FileUri } from "../../file-provider/index.js"
import { rootUri, trimUri, uriTrail } from "../../file-provider/uri.js"
import { IconFolder } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Tree, type TreeHandle, type TreeNode } from "../tree/index.js"
import { fileDialogMessages } from "./messages.js"

/** Folders asked for at a time, and the pages a branch reads looking for its first folder. */
const PAGE_SIZE = 100
const PAGES_FOR_FOLDERS = 5

interface Branch {
  folders: readonly FileEntry[]
  cursor: string | null
}

export interface FolderTreeProps {
  provider: FileProvider
  /** The folder showing. */
  uri: FileUri
  /** Called with the folder chosen. */
  onNavigate: (uri: FileUri) => void
}

/** The folders beside the list: lazily loaded and paged, with the current folder revealed. */
export function FolderTree({ provider, uri, onNavigate }: FolderTreeProps) {
  const messages = useMessages(fileDialogMessages)
  const root = rootUri(provider)
  const tree = useRef<TreeHandle>(null)
  const session = useRef<AbortController>(null)
  const [branches, setBranches] = useState<ReadonlyMap<string, Branch>>(new Map())
  useEffect(() => {
    const controller = new AbortController()
    session.current = controller
    return () => controller.abort()
  }, [])

  const load = useCallback(
    async (id: string, cursor: string | null) => {
      const signal = session.current?.signal ?? new AbortController().signal
      const folders: FileEntry[] = []
      let next = cursor
      for (let page = 0; page < PAGES_FOR_FOLDERS; page += 1) {
        const listing = await provider.readDirectory!(id, { signal, cursor: next, limit: PAGE_SIZE })
        folders.push(...listing.entries.filter((entry) => entry.kind === "directory"))
        next = listing.cursor
        if (next === null || folders.length > 0) break
      }
      if (signal.aborted) return
      setBranches((map) => {
        const known = map.get(trimUri(id))?.folders ?? []
        return new Map(map).set(trimUri(id), { folders: [...known, ...folders.filter((folder) => !known.some((other) => other.uri === folder.uri))], cursor: next })
      })
    },
    [provider]
  )

  const nodes = useMemo(() => {
    const build = (id: string, label: string, denied: boolean): TreeNode => {
      const branch = branches.get(trimUri(id))
      return {
        id: trimUri(id),
        label,
        icon: <IconFolder />,
        // A folder that denies reading can be chosen, which says why, but has nothing to open.
        hasChildren: !denied && (!branch || branch.folders.length > 0 || branch.cursor !== null),
        hasMore: branch ? branch.cursor !== null : false,
        ...(branch ? { children: branch.folders.map((folder) => build(folder.uri, folder.name, Boolean(folder.denied?.read))) } : null),
      }
    }
    return [build(root, provider.label, false)]
  }, [branches, provider.label, root])

  const uriById = useRef(new Map<string, FileUri>())
  uriById.current = new Map([[trimUri(root), root]])
  for (const branch of branches.values()) for (const folder of branch.folders) uriById.current.set(trimUri(folder.uri), folder.uri)

  // The current folder is on screen and marked, whichever way the person got there.
  const current = trimUri(uri)
  useEffect(() => {
    const trail = uriTrail(uri, root).map((step) => trimUri(step.uri))
    void tree.current?.reveal(current, { path: trail.slice(0, -1), align: "auto" })
  }, [current, root, uri])

  return (
    <Tree
      ref={tree}
      aria-label={messages.folders}
      nodes={nodes}
      selectableGroups
      groupCounts={false}
      selectedId={current}
      defaultExpanded={[trimUri(root)]}
      onSelectedIdChange={(id) => (id === null ? undefined : onNavigate(uriById.current.get(id) ?? id))}
      onLoadChildren={(node) => load(uriById.current.get(node.id) ?? node.id, null)}
      onLoadMore={(node) => load(uriById.current.get(node.id) ?? node.id, branches.get(node.id)?.cursor ?? null)}
    />
  )
}
