import {
  IconFile,
  IconFileArchive,
  IconFileAudio,
  IconFileCalendar,
  IconFileCode,
  IconFileContact,
  IconFileData,
  IconFileDatabase,
  IconFileDiskImage,
  IconFileDocument,
  IconFileEbook,
  IconFileEmail,
  IconFileExecutable,
  IconFileFont,
  IconFileImage,
  IconFileKey,
  IconFileLink,
  IconFileLock,
  IconFileModel,
  IconFilePdf,
  IconFilePresentation,
  IconFileScript,
  IconFileSpreadsheet,
  IconFileText,
  IconFileVector,
  IconFileVideo,
  IconFolder,
} from "../../icons/generated/icons.js"
import type { IconComponent, IconProps } from "../icon/index.js"
import { fileKind, type FileKind } from "./file-kind.js"

/** The icon for each file kind. */
export const FILE_KIND_ICONS: Readonly<Record<FileKind, IconComponent>> = {
  file: IconFile,
  folder: IconFolder,
  text: IconFileText,
  document: IconFileDocument,
  pdf: IconFilePdf,
  spreadsheet: IconFileSpreadsheet,
  presentation: IconFilePresentation,
  ebook: IconFileEbook,
  image: IconFileImage,
  vector: IconFileVector,
  audio: IconFileAudio,
  video: IconFileVideo,
  font: IconFileFont,
  model: IconFileModel,
  code: IconFileCode,
  script: IconFileScript,
  data: IconFileData,
  database: IconFileDatabase,
  archive: IconFileArchive,
  executable: IconFileExecutable,
  "disk-image": IconFileDiskImage,
  email: IconFileEmail,
  calendar: IconFileCalendar,
  contact: IconFileContact,
  key: IconFileKey,
  encrypted: IconFileLock,
  link: IconFileLink,
}

export interface FileIconProps extends Omit<IconProps, "name"> {
  /** File name or path. Its extension picks the icon when the MIME type is missing or generic. */
  name?: string | null
  /** MIME type. A specific type (`application/pdf`) wins over the extension. */
  mime?: string | null
  /** The kind, when the application already knows it. Skips detection. */
  kind?: FileKind
}

/**
 * The file-type icon for a file name, MIME type or known kind. Detection follows `fileKind`;
 * the chosen kind is on `data-file-kind` so an application can colour kinds from its own CSS.
 * Decorative by default like every icon: pass `label` when no visible text names the file.
 */
export function FileIcon({ name, mime, kind, ...rest }: FileIconProps) {
  const resolved = kind ?? fileKind({ name, mime })
  const Icon = FILE_KIND_ICONS[resolved]
  return <Icon {...rest} data-file-kind={resolved} />
}
