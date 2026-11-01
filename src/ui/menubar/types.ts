import type { ReactNode } from "react"
import type { MenuItemTone } from "../menu/index.js"

/** What every row that can be chosen shares. */
interface MenubarRow {
  /** Stable within its menu. Reported to `onCommand`. */
  id: string
  label: string
  /** Why the row is unavailable (R12.3). It stays focusable and shows this as its tooltip and description; a touch screen shows it under the label. */
  disabledReason?: string | null | undefined
  /** Dims the row with no reason. Prefer `disabledReason`. */
  disabled?: boolean
}

/** The keys a row shows. Showing them registers nothing: see `MenubarCommandEntry.shortcut`. */
interface MenubarKeys {
  /**
   * The command in a keymap. A KeymapProvider's rebinding, chords included, then shows on the
   * row. An action's `commandId`.
   */
  commandId?: string
  /**
   * The default keys, chords included ("mod+k mod+s"). Display only: the menubar adds no
   * listener. Run the keys with `useActionShortcuts` or `useShortcutCommands`, or leave them
   * to the element that handles them.
   */
  shortcut?: string
  /** The keys work only in part of the page. The row always shows them, and a click runs the row directly. */
  shortcutScoped?: boolean
}

/** A row that runs a command and closes the menu. The default kind. */
export interface MenubarCommandEntry extends MenubarRow, MenubarKeys {
  kind?: "item"
  /** Any node, held at the icon slot's size: an icon, or an image with `detail`. */
  icon?: ReactNode
  /** A second line under the label. The row takes the rich height, and `icon` a thumbnail's box. */
  detail?: ReactNode
  /** A short trailing note: the current value of what the row changes. */
  trail?: ReactNode
  tone?: MenuItemTone
  /** Called after the menu closes, so focus is home before a dialog opens. */
  onSelect?: () => void
}

/** A toggle. It stays open when pressed. The host holds the state, because a closed menu holds none. */
export interface MenubarCheckEntry extends MenubarRow, MenubarKeys {
  kind: "check"
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** One choice of a {@link MenubarRadioEntry}. */
export interface MenubarRadioOption extends MenubarKeys {
  value: string
  label: string
  /** Why the choice is unavailable. */
  disabledReason?: string | null | undefined
  disabled?: boolean
}

/** A set of choices, with an optional group label. The host holds the value, because a closed menu holds none. */
export interface MenubarRadioEntry {
  kind: "radio"
  id: string
  /** The group's label. It also names the group for assistive technology. */
  label: string
  /** Hide the visible label, for example under a submenu row that already says it. */
  hideLabel?: boolean
  value: string
  onValueChange: (value: string) => void
  options: readonly MenubarRadioOption[]
}

/** Rows set apart by space, with an optional label. */
export interface MenubarGroupEntry {
  kind: "group"
  id: string
  /** The group's label. */
  label?: string
  items: readonly MenubarEntryOrSkip[]
}

/** A hairline. At most two in a menu (R5.8); the last sets off destructive actions. */
export interface MenubarSeparatorEntry {
  kind: "separator"
  id: string
}

/** What the host's loader receives. */
export interface MenubarLoadContext {
  /** Aborted when the menu closes before the items arrive. */
  signal: AbortSignal
}

/** Supplies a menu's items when it opens, each time it opens. Reject to show the failure row. */
export type MenubarItemsLoader = (context: MenubarLoadContext) => readonly MenubarEntryOrSkip[] | Promise<readonly MenubarEntryOrSkip[]>

/** Where a menu or submenu gets its rows, and what it says while it has none. */
interface MenubarSource {
  /** The rows, when they are known up front. */
  items?: readonly MenubarEntryOrSkip[]
  /** Fetch the rows when the menu opens, instead of `items`. */
  loadItems?: MenubarItemsLoader
  /** Rows to reserve while loading. Later opens reserve as many as the last load returned. Default 4. */
  loadingRows?: number
  /** Replaces the failure row's text. Say what failed and what to do next (R2.4); a rejection's raw message is never shown. */
  loadError?: string | ((error: unknown) => string)
  /** Replaces the text shown when there are no rows. */
  emptyLabel?: string
}

/** A row that opens a nested menu. */
export interface MenubarSubmenuEntry extends MenubarRow, MenubarSource {
  kind: "submenu"
  icon?: ReactNode
  tone?: MenuItemTone
}

/** One row of a menu, as data. */
export type MenubarEntry = MenubarCommandEntry | MenubarCheckEntry | MenubarRadioEntry | MenubarGroupEntry | MenubarSeparatorEntry | MenubarSubmenuEntry

/** A row, or nothing: a conditional in a list and a hidden action leave no gap. */
export type MenubarEntryOrSkip = MenubarEntry | null | undefined | false

/** One menu of the bar. */
export interface MenubarMenu extends MenubarSource {
  /** Stable; the value of `openMenu`. */
  id: string
  label: string
  /** Shown on this menu's row when the bar has collapsed into one menu. */
  icon?: ReactNode
  /** Why the whole menu is unavailable. Its trigger stays focusable and shows the reason. */
  disabledReason?: string | null | undefined
  disabled?: boolean
}
