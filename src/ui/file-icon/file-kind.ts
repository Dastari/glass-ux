/**
 * The kind of file an icon stands for. A kind is a category, not a format: `spreadsheet`
 * covers XLSX, ODS, Numbers and CSV. Show the exact format as text beside the icon.
 */
export type FileKind =
  | "file"
  | "folder"
  | "text"
  | "document"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "ebook"
  | "image"
  | "vector"
  | "audio"
  | "video"
  | "font"
  | "model"
  | "code"
  | "script"
  | "data"
  | "database"
  | "archive"
  | "executable"
  | "disk-image"
  | "email"
  | "calendar"
  | "contact"
  | "key"
  | "encrypted"
  | "link"

/** What `fileKind` reads: a file name or path, a MIME type, or both. */
export interface FileKindSource {
  /** File name or path; the last extension decides (`report.final.PDF` → `pdf`). */
  name?: string | null
  /** MIME type as sent by a browser or server. Parameters such as `; charset=utf-8` are ignored. */
  mime?: string | null
}

const byMime = new Map<string, FileKind>()
const byExtension = new Map<string, FileKind>()
const add = (table: Map<string, FileKind>, kind: FileKind, keys: string) => {
  for (const key of keys.split(/\s+/)) if (key) table.set(key, kind)
}

add(byMime, "folder", "inode/directory application/x-directory text/directory")
add(byMime, "pdf", "application/pdf application/x-pdf")
add(
  byMime,
  "document",
  `application/msword application/rtf text/rtf application/vnd.apple.pages application/vnd.oasis.opendocument.text
   application/vnd.openxmlformats-officedocument.wordprocessingml.document
   application/vnd.openxmlformats-officedocument.wordprocessingml.template
   application/vnd.ms-word.document.macroenabled.12`
)
add(
  byMime,
  "spreadsheet",
  `application/vnd.ms-excel text/csv text/tab-separated-values application/vnd.apple.numbers
   application/vnd.oasis.opendocument.spreadsheet
   application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   application/vnd.openxmlformats-officedocument.spreadsheetml.template
   application/vnd.ms-excel.sheet.macroenabled.12`
)
add(
  byMime,
  "presentation",
  `application/vnd.ms-powerpoint application/vnd.apple.keynote application/vnd.oasis.opendocument.presentation
   application/vnd.openxmlformats-officedocument.presentationml.presentation
   application/vnd.openxmlformats-officedocument.presentationml.slideshow`
)
add(byMime, "ebook", "application/epub+zip application/x-mobipocket-ebook application/vnd.amazon.ebook")
add(byMime, "vector", "image/svg+xml application/postscript application/illustrator image/x-eps")
add(byMime, "font", "application/font-woff application/x-font-ttf application/x-font-otf application/vnd.ms-fontobject")
add(byMime, "model", "application/sla application/vnd.ms-pki.stl")
add(
  byMime,
  "code",
  `text/html application/xhtml+xml text/css text/javascript application/javascript application/typescript
   text/x-python text/x-c text/x-c++ text/x-java-source text/x-go text/x-rust application/x-httpd-php`
)
add(byMime, "script", "application/x-sh text/x-shellscript application/x-powershell application/x-bat")
add(
  byMime,
  "data",
  `application/json application/ld+json application/x-ndjson application/xml text/xml
   application/yaml application/x-yaml text/yaml application/toml`
)
add(byMime, "database", "application/vnd.sqlite3 application/x-sqlite3 application/sql application/x-msaccess")
add(
  byMime,
  "archive",
  `application/zip application/x-zip-compressed application/gzip application/x-gzip application/x-tar
   application/x-7z-compressed application/vnd.rar application/x-rar-compressed application/x-bzip2
   application/x-xz application/zstd application/x-compress`
)
add(
  byMime,
  "executable",
  `application/x-msdownload application/vnd.microsoft.portable-executable application/x-msi
   application/vnd.debian.binary-package application/x-rpm application/vnd.android.package-archive
   application/x-executable application/x-elf application/x-mach-binary application/java-archive`
)
add(
  byMime,
  "disk-image",
  "application/x-iso9660-image application/x-apple-diskimage application/x-raw-disk-image application/x-virtualbox-vdi"
)
add(byMime, "email", "message/rfc822 application/vnd.ms-outlook")
add(byMime, "calendar", "text/calendar")
add(byMime, "contact", "text/vcard text/x-vcard")
add(
  byMime,
  "key",
  `application/x-pem-file application/x-x509-ca-cert application/pkix-cert application/pkcs8
   application/x-pkcs12 application/pkcs10 application/pgp-keys`
)
add(byMime, "encrypted", "application/pgp-encrypted")
add(byMime, "link", "text/uri-list application/x-mswinurl application/internet-shortcut")

add(byExtension, "text", "txt log md markdown rst nfo")
add(byExtension, "document", "doc docx docm dot dotx odt rtf pages wpd")
add(byExtension, "pdf", "pdf")
add(byExtension, "spreadsheet", "xls xlsx xlsm xlsb xlt xltx ods numbers csv tsv")
// `.key` is a private key here, not a Keynote deck; Keynote sends its MIME type.
add(byExtension, "presentation", "ppt pptx pptm pps ppsx odp")
add(byExtension, "ebook", "epub mobi azw azw3 fb2")
add(byExtension, "image", "png jpg jpeg jfif gif webp avif heic heif bmp tif tiff ico psd raw cr2 nef dng")
add(byExtension, "vector", "svg svgz ai eps")
add(byExtension, "audio", "mp3 m4a aac wav flac ogg oga opus wma aif aiff mid midi")
add(byExtension, "video", "mp4 m4v mov mkv webm avi wmv mpg mpeg 3gp")
add(byExtension, "font", "ttf otf woff woff2 eot")
add(byExtension, "model", "stl obj fbx glb gltf 3mf step stp usdz blend")
add(
  byExtension,
  "code",
  `js mjs cjs jsx ts mts cts tsx html htm css scss less vue svelte py rb go rs java kt swift c h cpp
   hpp cc cs php lua dart scala r pl ex exs`
)
add(byExtension, "script", "sh bash zsh fish ps1 psm1 psd1 bat cmd vbs")
add(byExtension, "data", "json jsonl ndjson yaml yml toml xml ini cfg conf env plist reg evtx")
add(byExtension, "database", "sqlite sqlite3 db mdb accdb sql dump")
add(byExtension, "archive", "zip tar gz tgz bz2 tbz2 xz txz 7z rar zst lz lzma cab")
add(byExtension, "executable", "exe msi msix appx app deb rpm apk ipa appimage jar bin")
add(byExtension, "disk-image", "iso img dmg vhd vhdx vmdk vdi qcow2")
add(byExtension, "email", "eml msg mbox")
add(byExtension, "calendar", "ics ical")
add(byExtension, "contact", "vcf vcard")
add(byExtension, "key", "pem crt cer der key pub p12 pfx p7b csr asc")
add(byExtension, "encrypted", "gpg pgp age aes enc kdbx")
add(byExtension, "link", "url lnk webloc desktop")

/** Names without an extension that still say what they are. */
const byName = new Map<string, FileKind>([
  ["dockerfile", "code"],
  ["makefile", "code"],
  ["jenkinsfile", "code"],
  ["license", "text"],
  ["readme", "text"],
])

/** MIME types that say nothing about the content, so the name decides. */
const GENERIC_MIME = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "application/binary",
  "application/x-download",
  "application/force-download",
  "application/unknown",
  "text/plain",
])

const byFamily: Record<string, FileKind> = {
  image: "image",
  audio: "audio",
  video: "video",
  font: "font",
  model: "model",
  message: "email",
  text: "text",
}

/** Lower-case base name of a path, and its last extension (`""` when it has none). */
function nameParts(name: string): { base: string; extension: string } {
  const base = name.trim().split(/[\\/]/).pop()?.toLowerCase() ?? ""
  const dot = base.lastIndexOf(".")
  return { base, extension: dot >= 0 ? base.slice(dot + 1) : "" }
}

/**
 * The kind of a file from its MIME type and name. A specific MIME type wins; otherwise the
 * extension decides, then the MIME family (`image/*`, `text/*`), then `file`. Generic types
 * such as `application/octet-stream` and `text/plain` defer to the extension, so
 * `install.ps1` served as `text/plain` is a `script`. A name ending in `/` is a `folder`.
 */
export function fileKind({ name, mime }: FileKindSource): FileKind {
  const type = (mime ?? "").split(";")[0]!.trim().toLowerCase()
  if (!GENERIC_MIME.has(type)) {
    const exact = byMime.get(type)
    if (exact) return exact
  }
  if (name) {
    if (/[\\/]\s*$/.test(name)) return "folder"
    const { base, extension } = nameParts(name)
    const known = byExtension.get(extension) ?? byName.get(base)
    if (known) return known
  }
  if (type.endsWith("+json") || type.endsWith("+xml")) return "data"
  if (type.endsWith("+zip")) return "archive"
  return byFamily[type.split("/")[0]!] ?? "file"
}
