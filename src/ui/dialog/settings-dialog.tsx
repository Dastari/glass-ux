import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { VerticalTabs, type VerticalTabItem } from "../vertical-tabs/index.js"
import { Dialog, useDialogScrollEdges, type DialogPopupProps, type DialogSize } from "./dialog.js"
import { useDialogGuard } from "./use-dialog-guard.js"

export interface SettingsSection extends VerticalTabItem {
  /** The section's content. No heading that repeats the tab label (R2.1). */
  content: ReactNode
}

export interface SettingsDialogProps {
  /** Control that opens the overlay or action. */
  trigger?: ReactElement
  open?: boolean
  /** Called with the next open state when the dialog opens or closes. While `dirty`, a dismissal first asks to discard and only reports false once the person confirms. Pair with `open` to control it. */
  onOpenChange?: (open: boolean) => void
  icon?: ReactNode
  /** "Agent settings" */
  title: ReactNode
  /** Data: the target, e.g. "LMN-7C71". */
  subtitle?: ReactNode
  /** Section definitions in display order. */
  sections: SettingsSection[]
  /** Active section identifier. */
  section?: string
  /** Initially active section. */
  defaultSection?: string
  /** Write the section to the URL when it is a place (R6.2). */
  onSectionChange?: (section: string) => void
  /** Footer actions, primary last: Cancel, then an ActionButton "Save changes". */
  footer?: ReactNode
  /** Footer start slot (Reset to defaults). */
  footerStart?: ReactNode
  /** Guard closing while there are unsaved changes. */
  dirty?: boolean
  /** Called when the person confirms discarding unsaved changes, just before the dialog closes; revert the form here. */
  onDiscard?: () => void
  size?: Extract<DialogSize, "lg" | "xl">
  /** The element or behaviour to focus when the dialog opens (Base UI `initialFocus`). By default a keyboard open focuses the current section's tab, and a touch open the dialog itself. */
  initialFocus?: DialogPopupProps["initialFocus"]
}

/**
 * The settings pattern (R13.2): header with icon tile, title and a data subtitle; an L3
 * rail of sections beside a scrolling pane; a pinned footer. The rail is the shared
 * VerticalTabs, so it becomes a chip strip (or a picker) when the dialog is narrow — on a
 * phone sheet, in a small window. Its height is fixed so switching sections never
 * resizes the dialog.
 */
export function SettingsDialog({
  trigger,
  open: openProp,
  onOpenChange,
  icon,
  title,
  subtitle,
  sections,
  section,
  defaultSection,
  onSectionChange,
  footer,
  footerStart,
  dirty = false,
  onDiscard,
  size = "xl",
  initialFocus,
}: SettingsDialogProps) {
  const [uncontrolled, setUncontrolled] = useState(false)
  const open = openProp ?? uncontrolled
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  const guard = useDialogGuard({ open, onOpenChange: setOpen, dirty, onDiscard })

  return (
    <Dialog.Root {...guard.rootProps}>
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Popup size={size} kind="settings" initialFocus={initialFocus}>
        <Dialog.Header icon={icon} title={title} subtitle={subtitle} />
        <SettingsSections sections={sections} section={section} defaultSection={defaultSection} onSectionChange={onSectionChange} label={typeof title === "string" ? `${title} sections` : "Sections"} />
        <Dialog.Footer start={footerStart}>{footer}</Dialog.Footer>
        {guard.confirm}
      </Dialog.Popup>
    </Dialog.Root>
  )
}

interface SettingsSectionsProps {
  /** Section definitions in display order. */
  sections: SettingsSection[]
  /** Active section identifier. */
  section?: string | undefined
  /** Initially active section. */
  defaultSection?: string | undefined
  /** Called with the chosen section's `value` when the person switches section; the pane scrolls back to the top. Pair with `section` to control it. */
  onSectionChange?: ((section: string) => void) | undefined
  label: string
  /** Keep every section mounted (hidden when not current), so one form spans them all. */
  keepMounted?: boolean
}

/** The rail + pane body of a settings dialog. Usable inside any Dialog.Popup. */
export function SettingsSections({ sections, section, defaultSection, onSectionChange, label, keepMounted = false }: SettingsSectionsProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    paneRef.current = wrapRef.current?.querySelector<HTMLElement>(".fa-vtabs-content") ?? null
  })
  useDialogScrollEdges(paneRef)

  return (
    <div ref={wrapRef} className="fa-settings">
      <VerticalTabs.Root
        items={sections.map(({ value, label: text, icon, count, disabled, marker }) => ({ value, label: text, icon, count, disabled, marker }))}
        value={section}
        defaultValue={defaultSection}
        onValueChange={(next) => {
          if (paneRef.current) paneRef.current.scrollTop = 0
          onSectionChange?.(next)
        }}
        aria-label={label}
      >
        {sections.map((item) => (
          <VerticalTabs.Panel key={item.value} value={item.value} keepMounted={keepMounted}>
            {item.content}
          </VerticalTabs.Panel>
        ))}
      </VerticalTabs.Root>
    </div>
  )
}
