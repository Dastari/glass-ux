export { Dock, WindowSwitcher, groupWindowsByScope, type WindowGroup } from "./dock.js"
export {
  SNAP_LAYOUTS,
  SNAP_ZONES,
  SNAP_ZONE_LABELS,
  assignTiles,
  edgeSnapTarget,
  fracToRect,
  fracVars,
  maxTileColumns,
  type EdgeTarget,
  type FracRect,
  type SnapZone,
} from "./geometry.js"
export { fullscreenSupported, useWindowFullscreen, type WindowFullscreen } from "./fullscreen.js"
export { popupContainer, usePopupContainer } from "../lib/popup-container.js"
export { PopoutWindow, type PopoutWindowProps } from "./popout.js"
export {
  WindowContext,
  WindowManagerProvider,
  useCloseGuard,
  useFocusedWindowId,
  useOptionalWindowManager,
  useWindow,
  useWindowEntry,
  useWindowIndicator,
  useWindowManager,
  useWindowState,
  useWindowVisibility,
  useWindows,
  type WindowContextValue,
  type WindowVisibility,
} from "./react.js"
export {
  DEFAULT_MIN_WINDOW_SIZE,
  DEFAULT_WINDOW_SIZE,
  describeWindow,
  getWindowKind,
  listWindowKinds,
  registerWindowKind,
  type WindowContentProps,
  type WindowKindDefinition,
} from "./registry.js"
export {
  WindowScopeChip,
  WindowScopeProvider,
  describeScope,
  useWindowScopes,
  type WindowScopeInfo,
  type WindowScopes,
} from "./scope.js"
export { createWindowManager, windowStorageKey, type WindowManager, type WindowManagerOptions } from "./store.js"
export {
  PRIMARY_WINDOW_ID,
  type CloseGuard,
  type OpenWindowInput,
  type Rect,
  type WindowDescriptor,
  type WindowEntry,
  type WindowEvent,
  type WindowEventType,
  type WindowIndicator,
  type WindowLayout,
  type WindowManagerState,
  type WindowParams,
  type WindowStatusTone,
} from "./types.js"
export { Window, WindowBodySkeleton, WindowContentHost, type WindowStatusProps } from "./window-content.js"
export { WindowAction, type WindowActionPriority, type WindowActionProps } from "./window-actions.js"
export {
  WindowFrame,
  type WindowAppBarProps,
  type WindowBodyProps,
  type WindowControlsProps,
  type WindowFrameRootProps,
  type WindowStatusBarProps,
} from "./window-frame.js"
export { Workspace, type WorkspaceProps } from "./workspace.js"
