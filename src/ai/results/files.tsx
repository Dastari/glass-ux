import { IconDownload, IconFile } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { formatBytes } from "../../ui/file-drop/index.js"
import { FileIcon, FILE_KIND_ICONS, fileKind } from "../../ui/file-icon/index.js"
import type { IconComponent } from "../../ui/icon/index.js"
import { TruncatedText } from "../../ui/truncated-text/index.js"
import { formatNumber } from "../format.js"
import type { AiResult, ResultFile } from "../types.js"
import { ResultFrame } from "./frame.js"
import { useLocale } from "../../lib/locale/use-locale.js"

type FilesResult = Extract<AiResult, { type: "files" }>

/** The file-type icon component for a file; `FileIcon` (`glass-ux/file-icon`) renders it directly. */
export function fileIcon(file: Pick<ResultFile, "name" | "mime">): IconComponent {
  return FILE_KIND_ICONS[fileKind(file)]
}

/** The file's type icon as an element: `FileIcon` with the result file's name and MIME type. */
export function FileGlyph({ name, mime }: Pick<ResultFile, "name" | "mime">) {
  return <FileIcon name={name} mime={mime} />
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
  const locale = useLocale()
  return (
    <ResultFrame result={result} icon={<IconFile />} meta={`${formatNumber(result.files.length, 0, locale)} ${result.files.length === 1 ? "file" : "files"}`}>
      <ul className="fa-ai-files">
        {result.files.map((file) => (
          <FileRowItem key={file.id} file={file} />
        ))}
      </ul>
    </ResultFrame>
  )
}
