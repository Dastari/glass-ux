import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FileIcon, FILE_KIND_ICONS } from "./file-icon.js"
import { fileKind } from "./file-kind.js"

describe("fileKind", () => {
  it.each([
    [{ name: "Quarterly summary.pdf" }, "pdf"],
    [{ name: "C:\\Exports\\Inventory 2026.XLSX" }, "spreadsheet"],
    [{ name: "logs/export.tar.gz" }, "archive"],
    [{ name: "install.ps1", mime: "text/plain" }, "script"],
    [{ name: "download", mime: "application/pdf" }, "pdf"],
    [{ name: "blob.bin", mime: "application/zip" }, "archive"],
    [{ name: "scan", mime: "image/heic" }, "image"],
    [{ mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }, "document"],
    [{ mime: "text/csv; charset=utf-8" }, "spreadsheet"],
    [{ mime: "application/vnd.api+json" }, "data"],
    [{ mime: "text/x-unknown" }, "text"],
    [{ name: "logo.svg", mime: "application/octet-stream" }, "vector"],
    [{ name: ".env" }, "data"],
    [{ name: "Dockerfile" }, "code"],
    [{ name: "server.key" }, "key"],
    [{ name: "vault.kdbx" }, "encrypted"],
    [{ name: "photos/" }, "folder"],
    [{ mime: "inode/directory" }, "folder"],
    [{ name: "notes" }, "file"],
    [{}, "file"],
  ] as const)("%j is %s", (source, kind) => {
    expect(fileKind(source)).toBe(kind)
  })
})

describe("FileIcon", () => {
  it("draws the detected kind and exposes it for styling", () => {
    const html = renderToStaticMarkup(<FileIcon name="track.flac" size="sm" />)
    expect(html).toContain('data-icon="file-audio"')
    expect(html).toContain('data-file-kind="audio"')
    expect(html).toContain('aria-hidden="true"')
  })

  it("uses an explicit kind and passes icon props through", () => {
    const html = renderToStaticMarkup(<FileIcon name="track.flac" kind="video" label="Recording" tint={false} />)
    expect(html).toContain('data-icon="file-video"')
    expect(html).toContain('aria-label="Recording"')
    expect(html).toContain('data-tint="off"')
  })

  it("has a distinct icon for every kind", () => {
    const names = Object.values(FILE_KIND_ICONS).map((Icon) => Icon.iconName)
    expect(new Set(names).size).toBe(names.length)
  })
})
