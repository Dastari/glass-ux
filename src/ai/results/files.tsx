import { IconCode, IconDownload, IconFile, IconFileText, IconImage } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { formatBytes } from "../../ui/file-drop/index.js"
import type { IconComponent } from "../../ui/icon/index.js"
import { TruncatedText } from "../../ui/truncated-text/index.js"
import { formatNumber } from "../format.js"
import type { AiResult, ResultFile } from "../types.js"
import { ResultFrame } from "./frame.js"

type FilesResult = Extract<AiResult, { type: "files" }>

/** The glyph for a file by its type. */
export function fileIcon(file: Pick<ResultFile, "name" | "mime">): IconComponent {
  const mime = file.mime ?? ""
  const name = file.name.toLowerCase()
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/.test(name)) return IconImage
  if (/\.(ps1|psm1|sh|json|ya?ml|xml|reg|ts|js|sql|ini)$/.test(name)) return IconCode
  if (mime.startsWith("text/") || /\.(txt|log|csv|md|evtx)$/.test(name)) return IconFileText
  return IconFile
}

/** The file's type glyph as an element (a static component per type). */
export function FileGlyph({ name, mime }: Pick<ResultFile, "name" | "mime">) {
  const Icon = fileIcon({ name, mime })
  if (Icon === IconImage) return <IconImage />
  if (Icon === IconCode) return <IconCode />
  if (Icon === IconFileText) return <IconFileText />
  return <IconFile />
}

/** "CSV", "ZIP": the extension in capitals, for the data line. */
export function fileType(name: string) {
  const match = name.match(/\.([a-z0-9]{1,5})$/i)
  return match ? match[1]!.toUpperCase() : "File"
}

/** One downloadable file: type glyph, name, size and type, and a download button. */
export function FileRowItem({ file }: {
  /** The file to list: `name` and `mime` pick the glyph and type, `size` is in bytes, and `href` makes the button a download link. */
  file: ResultFile
}) {
  return (
    <li className="fa-ai-file">
      <span className="fa-tile-icon fa-ai-file-icon" aria-hidden>
        <FileGlyph name={file.name} mime={file.mime} />
      </span>
      <span className="fa-ai-file-text">
        <TruncatedText className="fa-ai-file-name" middle>
          {file.name}
        </TruncatedText>
        <span className="fa-ai-file-meta" data-numeric>
          {fileType(file.name)} · {formatBytes(file.size)}
        </span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        icon={<IconDownload />}
        aria-label={`Download ${file.name}`}
        render={file.href ? <a href={file.href} download={file.name} aria-label={`Download ${file.name}`} /> : undefined}
        nativeButton={!file.href}
      />
    </li>
  )
}

/** Files the agent produced (GlassUxAiShareFile) or collected, ready to download. */
export function ResultFiles({ result }: {
  /** The files result: each of its `files` becomes a FileRowItem, and the count is the data line. */
  result: FilesResult
}) {
  return (
    <ResultFrame result={result} icon={<IconFile />} meta={`${formatNumber(result.files.length)} ${result.files.length === 1 ? "file" : "files"}`}>
      <ul className="fa-ai-files">
        {result.files.map((file) => (
          <FileRowItem key={file.id} file={file} />
        ))}
      </ul>
    </ResultFrame>
  )
}
