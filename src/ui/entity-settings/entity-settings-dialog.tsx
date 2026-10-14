import { useStore } from "@tanstack/react-form"
import { useCallback, useEffect, useRef, useState, type ComponentType, type PropsWithChildren, type ReactNode } from "react"
import { IconLock, IconRefresh, IconWarning } from "../../icons/generated/icons.js"
import { ActionButton, Button, FEEDBACK_HOLD_MS, type ButtonStatus } from "../button/index.js"
import { Dialog, SettingsSections, useDialogGuard, type SettingsSection } from "../dialog/index.js"
import { FieldSkeleton } from "../field/index.js"
import { blurThenChange } from "../form/index.js"
import { SettingRowSkeleton } from "../setting-row/index.js"
import { getPath, ownsField, SettingsSaveError, tabMarkers, type FieldMarkerState, type SettingsConflict, type TabMarker } from "./settings-state.js"

/** How long the step-up's ✓ shows before saving starts (mirrors --duration-slower). */
const VERIFIED_BEAT_MS = 450
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The parts of a form's state the dialog reads. */
export interface SettingsFormState {
  /** Values rendered by the chart or multi-value control. */
  values: unknown
  fieldMeta: Record<string, FieldMarkerState | undefined>
  isDefaultValue: boolean
  isSubmitSuccessful: boolean
}

/** What the dialog needs from a `useAppForm` instance (any one fits). */
export interface EntitySettingsForm {
  formId: string
  /** Controlled view state, including loading, empty and error states. */
  state: SettingsFormState
  AppForm: ComponentType<PropsWithChildren>
  /** External store observed by the component. */
  store: {
    get(): SettingsFormState
    subscribe(listener: (value: SettingsFormState) => void): { unsubscribe(): void }
  }
  handleSubmit(): Promise<void>
  validateAllFields(cause: "submit"): Promise<unknown>
  reset(values?: never): void
  setFieldMeta(field: never, updater: never): void
}

type MetaWithErrors = { errorMap?: Record<string, unknown> } | undefined

/** Set (or clear, with undefined) the server's error on one field. */
function setServerError(form: EntitySettingsForm, name: string, message: string | undefined) {
  const updater = (prev: MetaWithErrors) => (prev ? { ...prev, errorMap: { ...prev.errorMap, onServer: message } } : prev)
  form.setFieldMeta(name as never, updater as never)
}

export interface EntitySettingsTab {
  value: string
  /** "General", "SNMP". */
  label: string
  /** Pass the icon without a size. */
  icon?: ReactNode
  /**
   * The form fields the tab edits, as names or prefixes ("snmp" covers "snmp.port"). They
   * drive the tab's dots: unsaved changes, and errors after a failed save. A tab that acts
   * on its own (Remove) lists none.
   */
  fields?: readonly string[]
  /** The tab's rows: stacked fields and setting rows, one per row (R15). */
  content: ReactNode
}

export interface EntitySettingsDialogProps {
  open: boolean
  /** Called when open change occurs. The callback type specifies its arguments. */
  onOpenChange: (open: boolean) => void
  /** The form every tab edits: one `useAppForm` with the entity's Zod schema. */
  form: EntitySettingsForm
  /** Tab definitions in display order. */
  tabs: readonly EntitySettingsTab[]
  /** The open tab, when it lives in the URL (`?settings=snmp`). */
  tab?: string
  /** Initially selected tab. */
  defaultTab?: string
  /** Called when tab change occurs. The callback type specifies its arguments. */
  onTabChange?: (tab: string) => void
  /** The entity's identity tile: its glyph or photo with the state dot. */
  media?: ReactNode
  /** Default "Settings". */
  title?: ReactNode
  /** Data only (R2.2): "NST-C106 · Northstar Studio". */
  subtitle?: ReactNode
  /** Names the entity in the discard question: "Discard changes to NST-C106?". */
  entityName?: string
  /** A save failed: the Save button shows ✕; put the reason in a toast here. */
  onSaveError?: (error: unknown) => void
  /** After a save is confirmed (the saved values are the new baseline). */
  onSaved?: () => void
  /** Tertiary footer actions on the left. */
  footerStart?: ReactNode
  size?: "lg" | "xl"
  /** Render in the page flow, open and non-modal (gallery specimens). */
  preview?: boolean
  /** The document is loading: every tab shows its skeleton and Save waits. */
  loading?: boolean
  /**
   * Fields (names or prefixes) that need MFA to change (PrivilegedWrite). While the
   * changes include one, Save reads "Verify and save" and runs `onVerify` first. Mark their
   * labels with PrivilegedMark. Reads never need it.
   */
  privileged?: readonly string[]
  /** The step-up: resolves once verified, throws if it was declined or failed. */
  onVerify?: () => Promise<void>
  /**
   * After a conflict (SettingsConflictError), reload the documents behind these fields: they
   * take the server's values and lose their edits; every other edit stays.
   */
  onReload?: (fields: readonly string[]) => Promise<void>
}

/** A tab's loading shape: the rows a settings tab usually starts with (R9.3). */
function TabSkeleton() {
  return (
    <div className="fa-form-stack fa-entity-settings-tab" role="group" aria-busy="true" aria-label="Loading settings">
      <FieldSkeleton labelWidth="30%" />
      <FieldSkeleton labelWidth="22%" />
      <SettingRowSkeleton labelWidth="34%" />
    </div>
  )
}

/**
 * The options every settings form spreads into `useAppForm`: Glass UX's blur-then-change
 * validation. The dialog itself reveals errors after a refused save (it switches to the
 * first tab with an error and focuses the field), so no `onSubmitInvalid` is needed.
 */
export const settingsFormBehaviour = { validationLogic: blurThenChange }

/** The first invalid control inside one tab's panel. */
function focusFirstInvalidIn(panel: Element | null) {
  // A section (FormGroup) is not a field: look inside it for the invalid field itself.
  const field = panel?.querySelector(".fa-field[data-invalid], .fa-fieldset:not([data-variant='section']):has([data-invalid]), .fa-setting-row:has([aria-invalid='true'])")
  const target = field?.querySelector<HTMLElement>(
    "input:not([type='hidden']):not([tabindex='-1']):not([aria-hidden='true']):not([readonly]), textarea, button:not([tabindex='-1']), [role='slider'], [tabindex='0'], input"
  )
  target?.focus({ focusVisible: true } as FocusOptions)
}

/**
 * Every entity's Settings dialog (R12.6, glass-ux-components-plan §5.1): an `lg` dialog whose
 * header is the entity's identity tile with "Settings" and a data subtitle, an L3 tab rail,
 * and Cancel / Save. One form spans every tab, so Save sends one document.
 *
 * - A tab with unsaved changes shows a neutral dot; after a refused save, tabs with errors
 *   show a danger dot, the dialog opens the first of them and focuses the field.
 * - Server errors (`SettingsSaveError.fieldErrors`) appear at their fields and clear as the
 *   field changes.
 * - Save is disabled until something changes, then confirms in place (R15.10). Changes to
 *   privileged fields (reassignment, credentials, routing) make it "Verify and save": a
 *   step-up first, then the save.
 * - A save refused because someone else saved first (SettingsConflictError) keeps the
 *   edits and says so beside Save, with Reload.
 * - Closing with unsaved changes asks first (R13.7). Cancel reverts and closes.
 * - On phones it is a bottom sheet; the rail becomes chips, or a picker past six tabs.
 */
export function EntitySettingsDialog({
  open,
  onOpenChange,
  form,
  tabs,
  tab,
  defaultTab,
  onTabChange,
  media,
  title = "Settings",
  subtitle,
  entityName,
  onSaveError,
  onSaved,
  footerStart,
  size = "lg",
  preview = false,
  loading = false,
  privileged = [],
  onVerify,
  onReload,
}: EntitySettingsDialogProps) {
  const [innerTab, setInnerTab] = useState(defaultTab ?? tabs[0]?.value ?? "")
  const requested = tab ?? innerTab
  const current = tabs.some((entry) => entry.value === requested) ? requested : (tabs[0]?.value ?? "")
  const [status, setStatus] = useState<ButtonStatus>("idle")
  const [phase, setPhase] = useState<"verify" | "save">("save")
  const [conflicts, setConflicts] = useState<readonly SettingsConflict[]>([])
  /** Tabs whose documents just saved: a ✓ dot for the feedback hold. */
  const [savedTabs, setSavedTabs] = useState<readonly string[]>([])
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(savedTimer.current), [])
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  /** Server errors shown at fields: the value each had when the server refused it. */
  const serverErrors = useRef(new Map<string, unknown>())
  useEffect(() => () => clearTimeout(holdTimer.current), [])

  const values = useStore(form.store, (state) => state.values)
  const fieldMeta = useStore(form.store, (state) => state.fieldMeta)
  const unchanged = useStore(form.store, (state) => state.isDefaultValue)
  const dirty = !unchanged
  // Field meta, not `form.options`: a useAppForm instance keeps a copy of its first options.
  const markers = tabMarkers(tabs, fieldMeta)
  for (const value of savedTabs) if (!markers[value]) markers[value] = "saved"
  const tabOf = (fields: readonly string[]) => tabs.find((entry) => fields.some((field) => ownsField(entry.fields ?? [], field)))
  for (const conflict of conflicts) {
    const owner = tabOf(conflict.fields)
    if (owner) markers[owner.value] = "error"
  }
  const needsVerify = Boolean(onVerify) && Object.entries(fieldMeta).some(([name, meta]) => meta?.isDefaultValue === false && ownsField(privileged, name))

  const select = (next: string) => {
    if (tab === undefined) setInnerTab(next)
    onTabChange?.(next)
  }

  const clearServerError = useCallback(
    (name: string) => {
      serverErrors.current.delete(name)
      setServerError(form, name, undefined)
    },
    [form]
  )

  // A server error clears as soon as its field changes.
  useEffect(() => {
    for (const [name, refused] of serverErrors.current) {
      if (getPath(values, name) !== refused) clearServerError(name)
    }
  }, [values, clearServerError])

  const hold = (next: ButtonStatus) => {
    setStatus(next)
    clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => setStatus("idle"), FEEDBACK_HOLD_MS)
  }

  /** Open the first tab with an error (the current one if it has any) and focus its field. */
  const revealErrors = () => {
    const now = tabMarkers(tabs, form.state.fieldMeta)
    const errored = tabs.filter((entry) => now[entry.value] === "error").map((entry) => entry.value)
    if (!errored.length) return
    const target = errored.includes(current) ? current : errored[0]!
    select(target)
    requestAnimationFrame(() => requestAnimationFrame(() => focusFirstInvalidIn(rootRef.current?.closest(".fa-dialog")?.querySelector(`[data-settings-tab="${CSS.escape(target)}"]`) ?? null)))
  }

  const markSaved = (saved: readonly string[]) => {
    clearTimeout(savedTimer.current)
    setSavedTabs(saved)
    savedTimer.current = setTimeout(() => setSavedTabs([]), FEEDBACK_HOLD_MS)
  }

  const save = async () => {
    if (status === "pending") return
    // The tabs this save is for: the ones with changes now.
    const dirtyTabs = tabs.filter((entry) => tabMarkers([entry], form.state.fieldMeta)[entry.value] === "dirty").map((entry) => entry.value)
    for (const name of serverErrors.current.keys()) clearServerError(name)
    clearTimeout(holdTimer.current)
    setPhase("save")
    setStatus("pending")
    try {
      await form.validateAllFields("submit")
      // Never ask for MFA to save something the form already refuses.
      if (Object.values(form.state.fieldMeta).some((meta) => (meta?.errors ?? []).some(Boolean))) {
        setStatus("idle")
        revealErrors()
        return
      }
      if (needsVerify && onVerify) {
        setPhase("verify")
        await onVerify()
        setStatus("success")
        await sleep(VERIFIED_BEAT_MS)
        setPhase("save")
        setStatus("pending")
      }
      await form.handleSubmit()
      if (form.state.isSubmitSuccessful) {
        form.reset(form.state.values as never)
        hold("success")
        setConflicts([])
        markSaved(dirtyTabs)
        onSaved?.()
      } else {
        setStatus("idle")
        revealErrors()
      }
    } catch (error) {
      hold("error")
      if (error instanceof SettingsSaveError) {
        // Each tab's document has its own outcome: saved (✓), refused fields, or a conflict.
        markSaved(tabs.filter((entry) => error.saved.some((field) => ownsField(entry.fields ?? [], field))).map((entry) => entry.value))
        for (const [name, message] of Object.entries(error.fieldErrors)) {
          serverErrors.current.set(name, getPath(form.state.values, name))
          setServerError(form, name, message)
        }
        // Someone else saved first: the edits stay; the tab is marked and Save says so with Reload.
        setConflicts(error.conflicts)
        if (error.conflicts.length && !Object.keys(error.fieldErrors).length) {
          const owner = tabOf(error.conflicts[0]?.fields ?? [])
          if (owner && owner.value !== current) select(owner.value)
          return
        }
      }
      onSaveError?.(error)
      revealErrors()
    }
  }

  const guard = useDialogGuard({
    open,
    onOpenChange,
    dirty,
    onDiscard: () => form.reset(),
    title: entityName ? `Discard changes to ${entityName}?` : "Discard unsaved changes?",
    description: "Your edits in this dialog are lost.",
  })

  const sections: SettingsSection[] = tabs.map((entry) => ({
    value: entry.value,
    label: entry.label,
    icon: entry.icon,
    marker: markers[entry.value] as TabMarker | undefined,
    content: loading ? (
      <TabSkeleton />
    ) : (
      <div className="fa-form-stack fa-entity-settings-tab" data-settings-tab={entry.value}>
        {entry.content}
      </div>
    ),
  }))

  const conflict = conflicts.find((entry) => tabOf(entry.fields)?.value === current) ?? conflicts[0]
  const conflictTab = conflict ? tabOf(conflict.fields) : undefined
  const conflictNotice = conflict ? (
    <div className="fa-entity-settings-conflict" role="status" data-testid="settings-conflict">
      <IconWarning className="fa-entity-settings-conflict-icon" />
      <span className="fa-entity-settings-conflict-text">
        {conflictTab && conflictTab.value !== current ? `${conflictTab.label} changed` : "Changed"} by {conflict.changedBy} since you opened it. Reload to see their changes.
      </span>
      {onReload ? (
        <ActionButton
          size="sm"
          variant="secondary"
          icon={<IconRefresh />}
          onAction={async () => {
            await onReload(conflict.fields)
            setConflicts((list) => list.filter((entry) => entry !== conflict))
          }}
        >
          Reload
        </ActionButton>
      ) : null}
    </div>
  ) : null

  const body = (
    <form.AppForm>
      <form
        noValidate
        className="fa-entity-settings-form"
        data-form={form.formId}
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void save()
        }}
      >
        <div ref={rootRef} hidden />
        <Dialog.Header media={media} title={title} subtitle={subtitle} />
        <SettingsSections sections={sections} section={current} onSectionChange={select} label={entityName ? `${entityName} settings` : "Settings sections"} keepMounted />
        <Dialog.Footer start={conflictNotice ?? footerStart}>
          <Button
            type="button"
            onClick={() => {
              form.reset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={needsVerify ? <IconLock /> : undefined}
            status={status}
            pendingLabel={phase === "verify" ? "Verifying…" : "Saving…"}
            successLabel={phase === "verify" ? "Verified" : "Saved"}
            errorLabel="Not saved"
            disabledReason={loading ? "Loading settings" : !dirty && status === "idle" ? "No changes to save" : undefined}
            data-verify={needsVerify ? "" : undefined}
          >
            {needsVerify ? "Verify and save" : "Save"}
          </Button>
        </Dialog.Footer>
      </form>
    </form.AppForm>
  )

  if (preview) {
    return (
      <Dialog.Preview size={size} kind="settings">
        {body}
        {guard.confirm}
      </Dialog.Preview>
    )
  }
  return (
    <Dialog.Root {...guard.rootProps}>
      {/* Focus starts on the open tab, not the Close button: its tooltip would take the first Esc. */}
      <Dialog.Popup size={size} kind="settings" initialFocus={() => rootRef.current?.closest(".fa-dialog")?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"], .fa-vtabs-picker') ?? true}>
        {body}
        {guard.confirm}
      </Dialog.Popup>
    </Dialog.Root>
  )
}

export type { TabMarker }
