/** The non-modal bottom sheet a phone shows secondary panels in, loaded when one first opens. */
import type { Ref } from "react"
import { Sheet } from "../sheet/index.js"

const SNAP_POINTS = [0.5, 1]

export interface PaneSheetProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The sheet finished sliding away. */
  onClosed: () => void
  /** The slot the panel's host moves into. */
  slotRef: Ref<HTMLDivElement>
}

export default function PaneSheet({ title, open, onOpenChange, onClosed, slotRef }: PaneSheetProps) {
  return (
    <Sheet.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed()
      }}
      modal={false}
      side="bottom"
      snapPoints={SNAP_POINTS}
    >
      <Sheet.Popup aria-label={title} initialFocus={false}>
        <Sheet.Header title={title} />
        <Sheet.Body>
          <div ref={slotRef} className="fa-pane-slot" data-sheet="" />
        </Sheet.Body>
      </Sheet.Popup>
    </Sheet.Root>
  )
}
