import { useRef, type ReactElement } from "react"
import { useControllable } from "../../lib/use-controllable.js"
import { Dialog } from "../dialog/index.js"
import { FileBrowser, type FileBrowserHandle } from "./file-browser.js"
import type { FileDialogProps } from "./types.js"

/**
 * Open, save and folder dialogs over any `FileProvider`. It lists and chooses, and never reads file
 * contents or writes them: the host does that in `onOpen`, `onSave` and `onChoose`, with
 * `{ signal, setProgress }`, so the library still never uploads.
 *
 * It adapts to what a provider has: no `readDirectory` gives a location field, no `write` leaves
 * the provider out of Save, no `thumbnail` leaves the list view, and no `createDirectory`, `rename`
 * or `delete` means no such command. An entry's `denied` disables the action and shows the reason.
 * `mode="folder"` returns the folder selected in the list, or else the one showing, and `places`
 * adds shortcuts to common folders in any mode.
 *
 * Keyboard: arrows move, Enter opens, Space selects, Shift extends, ⌘/Ctrl+A selects all loaded,
 * Backspace goes up a level, F2 renames, Delete deletes, typing jumps to a name, and Shift+F10 or
 * the Menu key opens a row's menu. Escape closes; during a run it cancels the run and stays open.
 * On phones it is a bottom sheet, the folders give way to the path line, and places to a menu.
 */
export function FileDialog(props: FileDialogProps): ReactElement {
  const { open: openProp, defaultOpen = false, onOpenChange, trigger } = props
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const run = useRef<AbortController | null>(null)
  const browser = useRef<FileBrowserHandle>(null)
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, details) => {
        // A run stops in place: nothing has closed, so a person who cancels keeps their choice.
        if (!next && run.current) {
          details.cancel()
          run.current.abort()
          return
        }
        setOpen(next)
      }}
    >
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Popup size="xl" className="fa-file-dialog" initialFocus={(interaction) => (interaction === "touch" ? true : (browser.current?.initialFocus() ?? true))}>
        <FileBrowser ref={browser} props={props} onClose={() => setOpen(false)} run={run} />
      </Dialog.Popup>
    </Dialog.Root>
  )
}

/** The same dialog in the page flow, for documentation and screenshots. Real parts, non-modal. */
export function FileDialogPreview(props: FileDialogProps): ReactElement {
  const run = useRef<AbortController | null>(null)
  return (
    <Dialog.Preview size="xl" className="fa-file-dialog-preview">
      <FileBrowser props={props} onClose={() => undefined} run={run} preview />
    </Dialog.Preview>
  )
}
