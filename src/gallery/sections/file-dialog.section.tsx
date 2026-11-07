import { useState } from "react"
import type { FileStat } from "../../file-provider/index.js"
import { memoryFiles } from "../../file-provider/memory.js"
import { IconFolder, IconHome, IconImage } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { FileConflictDialog, FileDialog, FileDialogPreview, type FileDialogPlace } from "../../ui/file-dialog/index.js"
import { longFolder, sampleWorkspace, slowListing, stuckListing, without } from "../fixtures/sample-files.js"
import { Rules, SectionPage, Specimen } from "../kit.js"

const noop = () => undefined
const PLACES: FileDialogPlace[] = [
  { label: "Home", uri: "workspace:///", icon: <IconHome /> },
  { label: "Pictures", uri: "workspace:///Pictures", icon: <IconImage /> },
  { label: "Drafts", uri: "workspace:///Reports/Drafts" },
  { label: "Archived reports", uri: "archive:///Reports", icon: <IconFolder /> },
  // Offered only where its location is: this dialog has none named "elsewhere".
  { label: "Elsewhere", uri: "elsewhere:///" },
]
const NEWER: FileStat = { uri: "team:///Plan.txt", name: "Plan.txt", kind: "file", size: 2048, version: "v9", modified: Date.UTC(2026, 2, 16, 9, 30) }
const stream = (text: string) => new Blob([text]).stream()

const WORKSPACE = sampleWorkspace()
const SECOND = sampleWorkspace("archive", "Archive")
const SLOW = slowListing(longFolder(2400, 60), 160)
const NO_LISTING = without(sampleWorkspace("link", "Link"), "readDirectory", "write", "applyEdits", "thumbnail", "rename", "delete", "createDirectory", "watch")
const READ_ONLY = without(sampleWorkspace("published", "Published"), "write", "applyEdits", "rename", "delete", "createDirectory")
const NO_THUMBNAILS = without(sampleWorkspace("plain", "Plain"), "thumbnail")
const CONFLICTS = sampleWorkspace("team", "Team")

const EMPTY = memoryFiles({}, { scheme: "empty", label: "Empty" })
const LOADING = stuckListing(sampleWorkspace("waiting", "Waiting"), null)
const REFUSED = stuckListing(sampleWorkspace("refused", "Refused"), "denied", "Your session has ended. Sign in again from the main window.")
const OFFLINE = stuckListing(sampleWorkspace("offline", "Offline"), "unavailable", "The archive is offline for maintenance until 18:00.")
const FLAT = memoryFiles({ "Notes.txt": { content: "Notes", mime: "text/plain", modified: 0 }, "Summary.pdf": { content: "Summary", mime: "application/pdf", modified: 0 } }, { scheme: "flat", label: "Flat" })

export default function FileDialogSection() {
  const [opened, setOpened] = useState("")
  const [saved, setSaved] = useState("")
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"list" | "grid">("grid")
  const [aborted, setAborted] = useState(0)
  const [abortable] = useState(() => slowListing(sampleWorkspace("distant", "Distant"), 2000, () => setAborted((count) => count + 1)))
  const [rival, setRival] = useState(true)
  const [compared, setCompared] = useState("")
  const [question, setQuestion] = useState<"changed" | "gone" | null>(null)
  const [answer, setAnswer] = useState("")
  const [folder, setFolder] = useState("")
  const [failNext, setFailNext] = useState(false)

  return (
    <SectionPage>
      <Specimen title="Open" description="Multiple selection with Shift, ⌘/Ctrl and the check marks. A dimmed entry says why it can't be chosen. Right-click or the ⋯ menu renames and deletes." layout="stack">
        <FileDialog
          mode="open"
          multiple
          providers={[WORKSPACE]}
          trigger={<Button>Open files</Button>}
          onOpen={async (selection, { signal }) => {
            if (!("provider" in selection)) return
            await Promise.all(selection.files.map((file) => selection.provider.read(file.uri, { offset: 0, length: 16 }, { signal, version: file.version })))
            setOpened(selection.files.map((file) => file.name).join(", "))
          }}
        />
        <p data-testid="file-dialog-opened">{opened || "Nothing opened"}</p>
      </Specimen>

      <Specimen title="Choose a folder" description="Choose folder returns the folder selected in the list, or else the one showing; the status line says which. Files stay listed, dimmed. Places jump to common folders, across locations, and fold into a menu where the dialog is narrow." layout="stack">
        <Button variant={failNext ? "soft" : "ghost"} aria-pressed={failNext} onClick={() => setFailNext((value) => !value)}>
          Fail the next choice
        </Button>
        <FileDialog
          mode="folder"
          providers={[WORKSPACE, SECOND]}
          places={PLACES}
          trigger={<Button>Choose a folder</Button>}
          onChoose={async ({ provider, folder: chosen }) => {
            if (failNext) {
              setFailNext(false)
              throw new Error("The sample refused this folder")
            }
            setFolder(`${provider.label}: ${chosen.uri}`)
          }}
        />
        <p data-testid="file-dialog-folder">{folder || "No folder chosen"}</p>
      </Specimen>

      <Specimen title="Places in Open and Save" description="The same shortcuts in the other two flows. Save leaves out a place in a location it can't write to." layout="stack">
        <FileDialog mode="open" providers={[WORKSPACE, SECOND]} places={PLACES} trigger={<Button>Open with places</Button>} onOpen={(selection) => setOpened(selection.files[0]?.name ?? "")} />
        <FileDialog mode="save" defaultName="Notes.txt" providers={[WORKSPACE, READ_ONLY]} places={[...PLACES, { label: "Published", uri: "published:///" }]} trigger={<Button>Save with places</Button>} onSave={() => Promise.reject(new Error("The sample doesn't save"))} />
      </Specimen>

      <Specimen title="Thumbnails and a filter" description="Controlled open and view. Only pictures can be chosen here; the rest stay listed, dimmed. Thumbnail cells have a fixed size and swap in place." layout="stack">
        <Button onClick={() => setOpen(true)}>Choose a picture</Button>
        <FileDialog mode="open" open={open} onOpenChange={setOpen} view={view} onViewChange={setView} accept="image/*" title="Choose a picture" providers={[WORKSPACE]} defaultUri="workspace:///Pictures" onOpen={(selection) => setOpened(selection.files[0]?.name ?? "")} />
      </Specimen>

      <Specimen title="Save" description="Choosing a format changes the extension. An existing name asks before replacing, and the host writes in onSave." layout="stack">
        <FileDialog
          mode="save"
          defaultName="Quarterly plan.txt"
          formats={[
            { label: "Plain text", extension: ".txt", mime: "text/plain" },
            { label: "Markdown", extension: ".md", mime: "text/markdown" },
          ]}
          providers={[READ_ONLY, WORKSPACE]}
          defaultUri="workspace:///Reports"
          trigger={<Button>Save a copy</Button>}
          onSave={async (target, { signal, setProgress }) => {
            setProgress(0.5)
            const result = await target.provider.write!(target.uri, stream("Plan"), { base: target.base, signal, onProgress: () => setProgress(1) })
            if (result.status === "written") setSaved(`${result.stat.name}, ${JSON.stringify(target.base)}`)
            return result
          }}
        />
        <p data-testid="file-dialog-saved">{saved || "Nothing saved"}</p>
      </Specimen>

      <Specimen title="A conflict" description="A rival write lands first, so onSave returns a conflict. The dialog stays open: Replace, Save a copy, Compare or Cancel." layout="stack">
        <FileDialog
          mode="save"
          defaultName="Plan.txt"
          providers={[CONFLICTS]}
          trigger={<Button>Save over a rival</Button>}
          onCompare={(current) => setCompared(current?.version ?? "gone")}
          onSave={async (target, { signal }) => {
            if (rival) {
              setRival(false)
              await CONFLICTS.write(target.uri, stream("A rival's version"), { base: { overwrite: true }, signal })
            }
            const result = await target.provider.write!(target.uri, stream("Mine"), { base: target.base, signal })
            if (result.status === "written") setSaved(`${result.stat.name}, ${JSON.stringify(target.base)}`)
            return result
          }}
        />
        <p data-testid="file-dialog-compared">{compared || "Nothing compared"}</p>
      </Specimen>

      <Specimen title="Locations and this device" description="Two providers show a location list. device adds FileDrop, which needs no provider and returns File objects." layout="stack">
        <FileDialog
          mode="open"
          multiple
          device
          accept=".txt,text/plain"
          providers={[WORKSPACE, SECOND]}
          trigger={<Button>Open from anywhere</Button>}
          onOpen={(selection) => setOpened(selection.files.map((file) => file.name).join(", "))}
        />
      </Specimen>

      <Specimen title="A long folder" description="2,400 files, 60 at a time, 160 ms a page. Pages join the end, so rows never move. total is known here; the count waits for the last page where it is not." layout="stack">
        <FileDialog mode="open" multiple providers={[SLOW]} trigger={<Button>Open the long folder</Button>} onOpen={(selection) => setOpened(`${selection.files.length} files`)} />
      </Specimen>

      <Specimen title="Leaving a folder aborts its requests" description="Each listing takes two seconds. Going elsewhere before it lands aborts it." layout="stack">
        <FileDialog mode="open" providers={[abortable]} trigger={<Button>Open the distant location</Button>} onOpen={noop} />
        <p data-testid="file-dialog-aborted">{`Listings aborted: ${aborted}`}</p>
      </Specimen>

      <Specimen title="What a provider has decides what the dialog offers" description="No method, no command. Each button opens a provider that lacks something." layout="row">
        <FileDialog mode="open" providers={[NO_LISTING]} trigger={<Button>No readDirectory</Button>} onOpen={(selection) => setOpened(selection.files[0]?.name ?? "")} />
        <FileDialog mode="open" providers={[READ_ONLY]} trigger={<Button>No write, rename or delete</Button>} onOpen={noop} />
        <FileDialog mode="open" defaultView="grid" providers={[NO_THUMBNAILS]} trigger={<Button>No thumbnail</Button>} onOpen={noop} />
        <FileDialog mode="save" defaultName="Notes.txt" providers={[READ_ONLY]} trigger={<Button>Save with no write</Button>} onSave={() => Promise.reject(new Error("Unreachable"))} />
      </Specimen>

      <Specimen title="In the page" description="FileDialogPreview draws the real parts in place, for documentation and comparison." layout="stack" wide>
        <div data-testid="file-dialog-list">
          <FileDialogPreview mode="open" multiple providers={[sampleWorkspace("list", "Workspace")]} onOpen={noop} />
        </div>
        <div data-testid="file-dialog-grid">
          <FileDialogPreview mode="open" defaultView="grid" providers={[sampleWorkspace("grid", "Workspace")]} defaultUri="grid:///Pictures" onOpen={noop} />
        </div>
        <div data-testid="file-dialog-save">
          <FileDialogPreview mode="save" defaultName="Quarterly plan.txt" providers={[sampleWorkspace("save", "Workspace")]} onSave={() => Promise.reject(new Error("Unreachable"))} />
        </div>
        <div data-testid="file-dialog-folder-preview">
          <FileDialogPreview mode="folder" providers={[sampleWorkspace("pick", "Workspace")]} places={[{ label: "Home", uri: "pick:///", icon: <IconHome /> }, { label: "Pictures", uri: "pick:///Pictures", icon: <IconImage /> }, { label: "Drafts", uri: "pick:///Reports/Drafts" }]} onChoose={noop} />
        </div>
      </Specimen>

      <Specimen title="States" description="Loading, empty, a provider with no folders, denied and failed all use the same box." layout="stack" wide>
        <div data-testid="file-dialog-loading">
          <FileDialogPreview mode="open" providers={[LOADING]} onOpen={noop} />
        </div>
        <div data-testid="file-dialog-empty">
          <FileDialogPreview mode="open" providers={[EMPTY]} onOpen={noop} />
        </div>
        <div data-testid="file-dialog-flat">
          <FileDialogPreview mode="open" providers={[FLAT]} onOpen={noop} />
        </div>
        <div data-testid="file-dialog-denied">
          <FileDialogPreview mode="open" providers={[REFUSED]} onOpen={noop} />
        </div>
        <div data-testid="file-dialog-error">
          <FileDialogPreview mode="open" providers={[OFFLINE]} onOpen={noop} />
        </div>
      </Specimen>

      <Specimen title="The conflict step alone" description="FileConflictDialog, for a plain Save that opens no dialog." layout="stack">
        <Button onClick={() => setQuestion("changed")}>A newer version</Button>
        <Button onClick={() => setQuestion("gone")}>The file has gone</Button>
        <FileConflictDialog
          open={question !== null}
          name="Plan.txt"
          current={question === "changed" ? NEWER : null}
          onCompare={() => {
            setAnswer("compare")
            setQuestion(null)
          }}
          onResolve={(choice) => {
            setAnswer(choice)
            setQuestion(null)
          }}
        />
        <p data-testid="file-dialog-answer">{answer || "No answer"}</p>
      </Specimen>

      <Rules
        do={["Pass the host's own provider, already signed in.", "Write in onSave with the base you are given.", "Pass the opened version as base when saving a document."]}
        dont={["Don't ask for a sign-in inside a provider: reject with denied and the provider's message.", "Don't overwrite in onSave with anything but the given base.", "Don't filter a page on the client and call it the folder: accept dims what doesn't apply."]}
      />
    </SectionPage>
  )
}
