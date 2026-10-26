import { defineMessages, resolveMessages } from "../lib/i18n/index.js"
import { getLocale } from "../lib/locale/locale.js"

/** English defaults for windows. */
export const windowsMessages = defineMessages("windows", {
  inItsOwnWindow: "In its own window",
  minimised: "Minimised",
  openWindows: "Open windows",
  windows: "Windows",
  allWindows: "All windows",
  currentPage: "Current page",
  close: (title: string) => `Close ${title}`,
  controlLabel: (action: string, title: string) => `${action} ${title}`,
  moveInstructions: "Moving window. Arrow keys move it, Enter places it, Escape cancels.",
  resizeInstructions: "Resizing window. Arrow keys change its size, Enter keeps it, Escape cancels.",
  move: "Move",
  resize: "Resize",
  finished: (action: string) => `${action} finished.`,
  cancelled: (action: string) => `${action} cancelled.`,
  windowMenuFor: (title: string) => `Window menu for ${title}`,
  restore: "Restore",
  maximise: "Maximise",
  minimise: "Minimise",
  closeAction: "Close",
  closedNotice: "This window was closed in the workspace.",
  organisation: (name: string) => `Organisation: ${name}`,
  moreActions: "More actions",
  unavailableNotice: "This window is not available in this version.",
  loadingWindow: "Loading window",
  windowControls: "Window controls",
  returnToWorkspace: "Return to workspace",
  popOut: "Pop out",
  exitFullScreen: "Exit full screen",
  fullScreen: "Full screen",
  switchWindows: "Switch windows",
  resizeColumn: (position: number) => `Resize column ${position}`,
  tileBesideThePage: "Tile beside the page",
  maximiseWindow: "Maximise window",
  dragToALayoutToSnapTheWindow: "Drag to a layout to snap the window",
  snapHalves: "Halves",
  snapThirds: "Thirds",
  snapTwoThirdsAndOneThird: "Two thirds and one third",
  snapQuarters: "Quarters",
  snapLeftHalf: "Left half",
  snapRightHalf: "Right half",
  snapLeftThird: "Left third",
  snapCentreThird: "Centre third",
  snapRightThird: "Right third",
  snapLeftTwoThirds: "Left two thirds",
  snapRightTwoThirds: "Right two thirds",
  snapTopLeftQuarter: "Top left quarter",
  snapTopRightQuarter: "Top right quarter",
  snapBottomLeftQuarter: "Bottom left quarter",
  snapBottomRightQuarter: "Bottom right quarter",
  unavailableWindow: "Unavailable window",
})

declare module "../lib/i18n/catalog.js" {
  interface MessageCatalog {
    windows: typeof windowsMessages.defaults
  }
}

/** Resolve windows wording outside React; pass the component's locale. */
export function getWindowsMessages(locale = getLocale()): typeof windowsMessages.defaults {
  return resolveMessages(windowsMessages.namespace, windowsMessages.defaults, locale)
}
