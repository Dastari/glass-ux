import type { ReactElement } from "react"
import type { FileProvider, FileStat, FileUri, FileVersion, WriteBase, WriteResult } from "../../file-provider/index.js"

/** What `onOpen` receives for files chosen in a location. */
export interface FileSelection {
  /** The location they came from. */
  provider: FileProvider
  /** Stat'ed on confirm, so each has the version to use as the later write's base. */
  files: readonly FileStat[]
}

/** What `onOpen` receives for files chosen from the device. */
export interface DeviceFileSelection {
  /** The picked or dropped files, which fit `accept`. */
  files: readonly File[]
}

/** What `onOpen` and `onSave` receive besides the choice: the run's abort signal and a progress reporter. */
export interface FileRunContext {
  /** Aborts when the person cancels. Pass it to the read or write. */
  signal: AbortSignal
  /** Report progress from 0 to 1 (the dialog shows a bar); `null` hides it again. */
  setProgress: (fraction: number | null) => void
}

/** How a folder's entries are shown. */
export type FileDialogView = "list" | "grid"

/** A format offered in Save. */
export interface FileDialogFormat {
  /** Application text naming the format. */
  label: string
  /** With or without the dot: `.webp`. */
  extension: string
  /** MIME type of the format. */
  mime: string
}

/** Where to save: what `onSave` writes to. */
export interface SaveTarget {
  /** The location chosen. */
  provider: FileProvider
  /** The file to write. */
  uri: FileUri
  /** The file name, as entered. */
  name: string
  /** The chosen format's `extension`, when `formats` is set. */
  format?: string
  /** Pass this to `write`. It is never a blind overwrite unless the person chose Replace in a conflict. */
  base: WriteBase
}

interface FileDialogBaseProps {
  /** Whether the dialog is open. Controlled while defined. */
  open?: boolean
  /** Whether it starts open when uncontrolled. */
  defaultOpen?: boolean
  /** Called with the next open state, after a dismissal and after a run succeeds. Not called while a run is cancelled in place. */
  onOpenChange?: (open: boolean) => void
  /** The element that opens it. Omit when controlling `open`. */
  trigger?: ReactElement
  /** The locations offered, in order. One hides the location list. */
  providers: readonly FileProvider[]
  /** Start here; otherwise the last place used in this session. */
  defaultUri?: FileUri
  /** How entries show. Controlled while defined. `grid` needs `thumbnail` on the location. */
  view?: FileDialogView
  /** How entries show at first when uncontrolled. Default `list`. */
  defaultView?: FileDialogView
  /** Called with the view the person picks. */
  onViewChange?: (view: FileDialogView) => void
  /** The dialog's title. Default Open, Open files or Save as. */
  title?: string
}

/** A FileDialog that chooses files. */
export interface OpenFileDialogProps extends FileDialogBaseProps {
  /** Choose existing files. */
  mode: "open"
  /** Same syntax as FileDrop: ".png,image/*". Other files stay listed, dimmed, with the reason. */
  accept?: string
  /** Allows more than one file (R11.8). */
  multiple?: boolean
  /** Adds a This device option, which is FileDrop. Needs no provider. */
  device?: boolean
  /** The dialog stays open and pending until this settles; a rejection shows in place. */
  onOpen: (selection: FileSelection | DeviceFileSelection, context: FileRunContext) => unknown
}

/** A FileDialog that chooses a folder and a name. */
export interface SaveFileDialogProps extends FileDialogBaseProps {
  /** Choose where to write. */
  mode: "save"
  /** The name to start with. */
  defaultName: string
  /** Offered in a Select; choosing one changes the name's extension. */
  formats?: readonly FileDialogFormat[]
  /** The version this document was opened at. Without it, an existing name asks before replacing. */
  base?: FileVersion
  /** The host writes. Returning a conflict moves the dialog to its conflict step; a rejection shows in place. */
  onSave: (target: SaveTarget, context: FileRunContext) => Promise<WriteResult>
  /** Adds Compare to the conflict step. */
  onCompare?: (current: FileStat | null) => void
}

/** The props of {@link FileDialog}: `mode` chooses between the two flows. */
export type FileDialogProps = OpenFileDialogProps | SaveFileDialogProps
