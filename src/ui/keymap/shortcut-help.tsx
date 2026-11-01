import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react"
import { IconEdit, IconSearch, IconUndo } from "../../icons/generated/icons.js"
import { foldText } from "../../lib/fold.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import { Dialog, type DialogRootProps } from "../dialog/index.js"
import { EmptyState } from "../empty-state/index.js"
import { SearchField } from "../input/index.js"
import { Kbd, useCharacterShortcuts, usePlatform } from "../kbd/kbd.js"
import { canonicalShortcut, formatShortcut, isCharacterShortcut, shortcutFromEvent } from "../kbd/shortcut.js"
import { kbdMessages } from "../kbd/messages.js"
import { Tooltip } from "../tooltip/index.js"
import { findConflicts, type ShortcutCommand, type ShortcutConflict } from "./dispatcher.js"
import { useKeymap } from "./keymap-provider.js"
import { keymapMessages } from "./messages.js"

/** A chord can be recorded up to this many steps; one more press starts over. */
const MAX_STEPS = 2

export interface ShortcutHelpDialogProps extends Pick<DialogRootProps, "open" | "defaultOpen" | "onOpenChange"> {
  /** The dialog's title. Default "Keyboard shortcuts". */
  title?: ReactNode
  /** Let the person change keys. Each change reaches the provider's `onKeymapChange`. */
  rebind?: boolean
  /** Group headings in this order; groups not listed follow in registration order. */
  groupOrder?: readonly string[]
}

interface Recording {
  id: string
  steps: string[]
}

/** Searchable, grouped list of the registered commands and their keys, in Kbd; with `rebind`, each can be changed. */
export function ShortcutHelpDialog({ title, rebind = false, groupOrder = [], open, defaultOpen, onOpenChange }: ShortcutHelpDialogProps) {
  const messages = useMessages(keymapMessages)
  return (
    <Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <Dialog.Popup size="md">
        <Dialog.Header title={title ?? messages.helpTitle} />
        <ShortcutList rebind={rebind} groupOrder={groupOrder} />
      </Dialog.Popup>
    </Dialog.Root>
  )
}

function ShortcutList({ rebind, groupOrder }: { rebind: boolean; groupOrder: readonly string[] }) {
  const messages = useMessages(keymapMessages)
  const locale = useLocale()
  const keymap = useKeymap()
  const [query, setQuery] = useState("")
  const [recording, setRecording] = useState<Recording | null>(null)
  const needle = foldText(query.trim(), locale)
  const groups = useMemo(() => {
    const byGroup = new Map<string, ShortcutCommand[]>()
    for (const command of keymap.commands) {
      const words = [command.label, command.group ?? "", ...(command.keywords ?? [])].join(" ")
      if (needle && !foldText(words, locale).includes(needle)) continue
      const group = command.group ?? messages.general
      byGroup.set(group, [...(byGroup.get(group) ?? []), command])
    }
    const rank = (group: string) => {
      const index = groupOrder.indexOf(group)
      return index < 0 ? groupOrder.length : index
    }
    return [...byGroup].toSorted((a, b) => rank(a[0]) - rank(b[0]))
    // keymap.commands is a new list when the dispatcher changes.
  }, [keymap.commands, needle, locale, groupOrder, messages.general])
  return (
    <>
      <div className="fa-keymap-search">
        <SearchField size="sm" aria-label={messages.searchShortcuts} placeholder={messages.searchShortcuts} value={query} onValueChange={(value) => setQuery(String(value))} onClear={() => setQuery("")} />
      </div>
      <Dialog.Body>
        {groups.length === 0 ? <EmptyState icon={<IconSearch />}>{messages.noMatchFor(query.trim())}</EmptyState> : null}
        {groups.map(([group, commands]) => (
          <section key={group} className="fa-keymap-group" aria-label={group}>
            <h3 className="fa-overline">{group}</h3>
            <ul className="fa-keymap-rows">
              {commands.map((command) => (
                <ShortcutRow key={command.id} command={command} rebind={rebind && command.rebindable !== false} recording={recording?.id === command.id ? recording : null} onRecording={setRecording} />
              ))}
            </ul>
          </section>
        ))}
      </Dialog.Body>
      {rebind ? (
        <Dialog.Footer>
          <Button variant="ghost" onClick={keymap.resetAll}>
            {messages.resetAll}
          </Button>
        </Dialog.Footer>
      ) : null}
    </>
  )
}

function ShortcutRow({ command, rebind, recording, onRecording }: { command: ShortcutCommand; rebind: boolean; recording: Recording | null; onRecording: (recording: Recording | null) => void }) {
  const messages = useMessages(keymapMessages)
  const keymap = useKeymap()
  const characterKeys = useCharacterShortcuts()
  const keys = keymap.keysFor(command.id).filter((value) => characterKeys || !isCharacterShortcut(value))
  return (
    <li className="fa-keymap-row" data-command={command.id}>
      <span className="fa-keymap-label">
        {command.label}
        {command.disabledReason ? <span className="fa-keymap-reason">{command.disabledReason}</span> : null}
      </span>
      <span className="fa-keymap-keys">
        {keys.length ? keys.map((value) => <Kbd key={value} keys={value} size="sm" />) : <span className="fa-keymap-unset">{messages.notSet}</span>}
      </span>
      {rebind ? (
        <span className="fa-keymap-actions">
          <Tooltip content={messages.change(command.label)}>
            <Button variant="ghost" size="xs" icon={<IconEdit />} aria-label={messages.change(command.label)} onClick={() => onRecording({ id: command.id, steps: [] })} />
          </Tooltip>
          <Tooltip content={messages.reset(command.label)}>
            <Button variant="ghost" size="xs" icon={<IconUndo />} aria-label={messages.reset(command.label)} onClick={() => keymap.reset(command.id)} />
          </Tooltip>
        </span>
      ) : null}
      {recording ? <Recorder command={command} recording={recording} onRecording={onRecording} /> : null}
    </li>
  )
}

/** The input a new shortcut is pressed into. Tab leaves it and Escape cancels, so it never traps focus. */
function Recorder({ command, recording, onRecording }: { command: ShortcutCommand; recording: Recording; onRecording: (recording: Recording | null) => void }) {
  const messages = useMessages(keymapMessages)
  const kbd = useMessages(kbdMessages)
  const platform = usePlatform()
  const characterKeys = useCharacterShortcuts()
  const keymap = useKeymap()
  const value = recording.steps.join(" ")
  const conflict = useMemo<ShortcutConflict | null>(() => {
    if (!value) return null
    const others = keymap.commands
      .filter((other) => other.id !== command.id)
      .map((other) => ({ id: other.id, context: other.context, keys: keymap.keysFor(other.id) }))
    const found = findConflicts([{ id: command.id, context: command.context, keys: [value] }, ...others], platform).filter((item) => item.commands.includes(command.id))
    return found.find((item) => item.kind === "reserved") ?? found.find((item) => item.kind === "same") ?? found.find((item) => item.kind === "prefix") ?? null
  }, [value, keymap, command, platform])
  const otherLabel = (ids: readonly string[]) => keymap.commands.find((other) => other.id !== command.id && ids.includes(other.id))?.label ?? ""
  const off = value !== "" && !characterKeys && isCharacterShortcut(value)
  const note = off ? messages.characterKeysOff : conflict?.kind === "reserved" ? messages.browserKeeps : conflict?.kind === "same" ? messages.alsoAssigned(otherLabel(conflict.commands)) : conflict?.kind === "prefix" ? messages.startsTheSame(otherLabel(conflict.commands)) : null
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) return
    event.preventDefault()
    // The dialog and the dispatcher never see these: Escape cancels this, not the dialog.
    event.stopPropagation()
    event.nativeEvent.stopPropagation()
    if (event.key === "Escape") return onRecording(null)
    if (event.repeat) return
    const step = shortcutFromEvent(event.nativeEvent, platform)
    if (step) onRecording({ id: command.id, steps: recording.steps.length >= MAX_STEPS ? [step] : [...recording.steps, step] })
  }
  const save = () => {
    const held = conflict?.kind === "same" ? conflict : null
    const release = held
      ? held.commands
          .filter((id) => id !== command.id)
          .flatMap((id) => keymap.keysFor(id).flatMap((keys) => (canonicalShortcut(keys, platform) === canonicalShortcut(value, platform) ? [{ id, keys }] : [])))
      : []
    keymap.rebind(command.id, [value], release)
    onRecording(null)
  }
  return (
    <div className="fa-keymap-recorder">
      <input
        className="fa-keymap-input"
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- the person just asked to press a shortcut here
        autoFocus
        readOnly
        aria-label={messages.newShortcut(command.label)}
        aria-describedby={undefined}
        placeholder={messages.pressKeys}
        value={value ? formatShortcut(value, platform, kbd) : ""}
        onKeyDown={onKeyDown}
      />
      <Button size="sm" variant="primary" disabled={!value || conflict?.kind === "reserved" || off} onClick={save}>
        {messages.save}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onRecording(null)}>
        {messages.cancel}
      </Button>
      <p className="fa-keymap-note" role="status">
        {note}
      </p>
    </div>
  )
}
