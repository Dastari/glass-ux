/**
 * Document Picture-in-Picture with the same media element. Tested in Chromium 156: moving a
 * playing element to the window's document and back fires no `emptied`, `loadstart` or `pause`,
 * and `currentTime` carries on, so nothing reloads. The element's position in the player is
 * kept so it returns exactly there. React never sees the move; the window's controls are a
 * portal, because a DOM subtree moved by hand would lose React's event delegation.
 */

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

/** Whether this window can open a Document Picture-in-Picture window. */
export const documentPipSupported = () => typeof window !== "undefined" && "documentPictureInPicture" in window

/** The open window, its portal target and how to give the element back. */
export interface DocumentPipSession {
  /** Portal the window's controls here. */
  host: HTMLElement
  /** Return the element and close the window. */
  close(): void
}

function copyStyles(target: Document) {
  for (const sheet of document.querySelectorAll<HTMLElement>("link[rel='stylesheet'], style")) target.head.append(sheet.cloneNode(true))
  for (const { name, value } of Array.from(document.documentElement.attributes)) target.documentElement.setAttribute(name, value)
}

/** Open the window and move `media` into it. Needs a user gesture. */
export async function openDocumentPip(media: HTMLMediaElement, onClose: () => void): Promise<DocumentPipSession> {
  const parent = media.parentNode
  const next = media.nextSibling
  const box = media.getBoundingClientRect()
  const pip = await window.documentPictureInPicture!.requestWindow({ width: Math.round(Math.max(box.width, 320)), height: Math.round(Math.max(box.height, 180)) })
  copyStyles(pip.document)
  const host = pip.document.createElement("div")
  host.className = "fa-media-pip"
  pip.document.body.append(host)
  host.append(media)
  let open = true
  const restore = () => {
    if (!open) return
    open = false
    if (parent?.isConnected) parent.insertBefore(media, next?.parentNode === parent ? next : null)
    onClose()
  }
  pip.addEventListener("pagehide", restore, { once: true })
  return {
    host,
    close() {
      restore()
      pip.close()
    },
  }
}
