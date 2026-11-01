/**
 * What a strip loads only when it uses it: the drag scope and the tab context menu. Kept out
 * of tabs.tsx so a plain tab strip, and everything built on one, does not carry the drag
 * manager or the menus.
 */
import type { ReactElement, ReactNode, Ref } from "react"
import { useMediaQuery } from "../../lib/use-media-query.js"
import { ContextMenu } from "../context-menu/index.js"
import { DragDropProvider, DropZoneScope, useDraggable, useDropZone } from "../drag-drop/index.js"
import { useHasDragDropProvider } from "../drag-drop/drag-drop.js"
import { Menu } from "../menu/index.js"
import type { DropEvent } from "../drag-drop/index.js"
import type { TabDragData, TabItem } from "./tabs.js"

/** Touch keeps long-press for the context menu, whose Move rows are the single-pointer route. */
const TOUCH_ONLY = "(hover: none) and (pointer: coarse)"

interface ZoneOptions {
  /** The zone's id: the `zoneId` prop, or a generated one. */
  id: string
  /** The zone's name for announcements. */
  label: string
  /** The drag type tabs of this strip carry and accept. */
  type: string
  onDrop: (event: DropEvent<TabDragData>) => void
}

export interface TabExtrasProps {
  /** Set when tabs can be dragged. */
  zone: ZoneOptions | null
  /** Draws the bar, given how to wrap each tab, the ref for the drop zone and the tab menu. */
  children: (wrapTab: WrapTab, zoneRef: Ref<HTMLElement> | undefined, tabMenu: (props: TabMenuProps) => ReactNode) => ReactNode
}

/** Wraps one tab: `tab` receives the ref the drag needs. */
export type WrapTab = (item: TabItem, tab: (ref: Ref<HTMLElement> | undefined) => ReactNode) => ReactNode

function DraggableTab({ item, type, stripId, tab }: { item: TabItem; type: string; stripId: string; tab: (ref: Ref<HTMLElement> | undefined) => ReactNode }) {
  const touchOnly = useMediaQuery(TOUCH_ONLY)
  const draggable = useDraggable<TabDragData>({
    id: item.value,
    type,
    data: { value: item.value, stripId },
    label: item.label,
    disabled: item.disabled || touchOnly,
    // Enter and Space belong to the tab: its keyboard route is Shift and the arrow keys.
    liftKeys: [],
    grip: false,
  })
  const ref = (element: HTMLElement | null) => {
    draggable.ref(element)
    draggable.handleRef(element)
  }
  return tab(ref)
}

function Zone({ zone, children }: { zone: ZoneOptions; children: TabExtrasProps["children"] }) {
  const { ref } = useDropZone<TabDragData>({ id: zone.id, label: zone.label, accept: zone.type, sort: "horizontal", onDrop: zone.onDrop }, { trackState: false })
  const wrap: WrapTab = (item, tab) => <DraggableTab key={item.value} item={item} type={zone.type} stripId={zone.id} tab={tab} />
  return <DropZoneScope zoneId={zone.id}>{children(wrap, ref, tabMenu)}</DropZoneScope>
}

/** Strips join a provider above them, so tabs can cross; alone, one brings its own. */
function DragScope({ zone, children }: { zone: ZoneOptions; children: TabExtrasProps["children"] }) {
  const shared = useHasDragDropProvider()
  const body = <Zone zone={zone}>{children}</Zone>
  return shared ? body : <DragDropProvider>{body}</DragDropProvider>
}

const plain: WrapTab = (_, tab) => tab(undefined)

export default function TabExtras({ zone, children }: TabExtrasProps) {
  return zone ? <DragScope zone={zone}>{children}</DragScope> : children(plain, undefined, tabMenu)
}

/** A row the strip adds to a tab's menu. */
export interface TabMenuRow {
  label: string
  disabled?: boolean
  /** Shown at the row's end. */
  shortcut?: string
  run: () => void
}

export interface TabMenuProps {
  /** Names the menu. */
  label: string
  /** The tab element. It forwards its ref and spreads props. */
  tab: ReactElement
  /** The strip's rows. */
  rows: readonly TabMenuRow[]
  /** The item's own rows, first. */
  extra: ReactNode
}

/** Right-click, long-press, Shift+F10 or the Menu key on a tab (R11.5, R11.6). */
function tabMenu({ label, tab, rows, extra }: TabMenuProps) {
  return (
    <ContextMenu.Root key={tab.key}>
      <ContextMenu.Trigger render={tab} />
      <ContextMenu.Popup aria-label={label}>
        {extra}
        {rows.map((row) => (
          <Menu.Item key={row.label} disabled={row.disabled} shortcut={row.shortcut} onClick={row.run}>
            {row.label}
          </Menu.Item>
        ))}
      </ContextMenu.Popup>
    </ContextMenu.Root>
  )
}
