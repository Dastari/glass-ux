import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import {
  IconBackspace,
  IconCapsLock,
  IconChevronLeft,
  IconChevronRight,
  IconGlobe,
  IconKeyboardHide,
  IconReturn,
  IconSearch,
  IconSend,
  IconShift,
} from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { isRtl, readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { VisuallyHidden } from "../visually-hidden/index.js"
import { applyKey, type EditOptions, type EditState } from "./edit.js"
import {
  alternatesFor,
  layerRows,
  normalizeKey,
  resolveKeyboardLayout,
  rowUnits,
  type BuiltInLayoutId,
  type KeyboardLayout,
  type KeyRow,
  type NormalizedKey,
} from "./layouts.js"
import { onScreenKeyboardMessages } from "./messages.js"
import { nextKeyIndex, rowEdgeIndex, type NavigationDirection } from "./navigation.js"
import { readTarget, resolveTarget, submitFromTarget, writeTarget } from "./target.js"

/** What the Enter key says and does: its label follows the target's `enterkeyhint`. */
export type EnterKind = "enter" | "search" | "go" | "done" | "next" | "send"

/** How a key was pressed. */
export type KeyPressSource = "pointer" | "keyboard" | "typing" | "alternate"

/** Passed with every key press, before the keyboard acts on it. */
export interface KeyPressDetails {
  /** The key as pressed, in its object form; `text` is what it types, after Shift. */
  key: NormalizedKey
  /** The layout shown when the key was pressed. */
  layout: KeyboardLayout
  /** The layer shown when the key was pressed ("default", "symbols", …). */
  layer: string
  /** Pointer, keyboard (Enter or Space on a focused key), typing captured from a physical keyboard, or an alternate chosen by press and hold. */
  source: KeyPressSource
  /** Whether a handler called preventDefault. */
  readonly defaultPrevented: boolean
  /** Skip what the keyboard would do: the edit, Enter's submit, a layer or layout change. */
  preventDefault(): void
}

/** The target prop: a ref to an input, textarea or contenteditable element, or the element. */
export type OnScreenKeyboardTarget = RefObject<HTMLElement | null> | HTMLElement | null

/** Props for OnScreenKeyboard. */
export interface OnScreenKeyboardProps extends Omit<ComponentProps<"div">, "defaultValue" | "onKeyPress" | "children"> {
  /** The layout shown: a layout or a built-in identifier. Default: the first of `layouts`, else the locale's layout (`layoutForLocale`). A new value replaces the shown layout. */
  layout?: KeyboardLayout | BuiltInLayoutId
  /** The layouts the globe key cycles through. Omit, or give one, for no globe key. */
  layouts?: ReadonlyArray<KeyboardLayout | BuiltInLayoutId>
  /** Called with the layout the globe key moved to. */
  onLayoutChange?: (layout: KeyboardLayout) => void
  /** The text, when the keyboard owns it (no `target`). Pair with `onValueChange`. */
  value?: string
  /** The initial text when uncontrolled and without a target. Default "". */
  defaultValue?: string
  /** Called with the new text after each edit when the keyboard owns the text (no `target`). */
  onValueChange?: (value: string, details: KeyPressDetails) => void
  /**
   * An input, textarea or contenteditable element to type into, or a ref to one. The
   * keyboard edits it at its caret and fires `input` events, so React-controlled inputs
   * update. Pointer presses never take focus from it.
   */
  target?: OnScreenKeyboardTarget
  /** Called for every press, before the keyboard acts; `details.preventDefault()` skips the action. */
  onKeyPress?: (key: NormalizedKey, details: KeyPressDetails) => void
  /**
   * Called when Enter is pressed. Unless prevented, an input target gets an Enter keydown
   * and then its form is submitted (requestSubmit); a textarea or contenteditable target
   * gets a new line.
   */
  onEnter?: (details: KeyPressDetails) => void
  /** The Enter key's label and colour. Default: the target's `enterkeyhint`, else "enter". */
  enterKind?: EnterKind
  /** Key size: sm for narrow panels, md (default) about a control's height, lg for TVs viewed from across a room. */
  size?: "sm" | "md" | "lg"
  /** keys: separate keycaps (the default for typing layouts); grid: flat tiles (the default for grid layouts: the alphabet, number pads). */
  variant?: "keys" | "grid"
  /** Physical keys typed while focus is on the keyboard edit the text or target. Default true. */
  captureTyping?: boolean
  /** Arrow keys continue from the far side at an edge, instead of calling `onNavigateOut`. Default false. */
  wrap?: boolean
  /** Called when an arrow key is pressed at the keyboard's edge, with the screen direction: move focus to the results beside it. */
  onNavigateOut?: (direction: NavigationDirection) => void
  /** Called when Escape is pressed on the keyboard. */
  onEscape?: () => void
  /**
   * Shows a hide key and is called when it is pressed. Typing layouts put it on the bottom
   * row; a grid layout (a number pad) puts it in a blank cell, and shows none without one.
   */
  onHide?: () => void
  /** Focus the first key on mount (TV interfaces). */
  autoFocus?: boolean
  /** Every key is disabled. */
  disabled?: boolean
  /** Press and hold (500 ms, or a held Enter) offers accented alternates. Default true. */
  showAlternates?: boolean
  /** Overrides the locale for the default layout, `decimal` and `alphabet`. */
  locale?: string
}

type ShiftState = "off" | "once" | "lock"

interface PlacedKey {
  id: string
  key: NormalizedKey
  row: number
  start: number
  span: number
}

interface AlternatesState {
  id: string
  base: NormalizedKey
  list: readonly string[]
  index: number
  keyboard: boolean
}

const HOLD_MS = 500
const DOUBLE_SHIFT_MS = 400
const REPEAT_MS = 75
// Key widths are laid out in quarter units, so 1.25 and 1.5 wide keys line up across rows.
const STEPS = 4
const COMBINING = /^\p{M}+$/u

function adjustRows(rows: readonly KeyRow[], options: { globe: boolean; hide: boolean; grid: boolean }): NormalizedKey[][] {
  const result = rows.map((row) => row.map(normalizeKey))
  for (const row of result) {
    const space = row.find((key) => key.action === "space")
    for (let index = row.length - 1; index >= 0; index--) {
      const key = row[index] as NormalizedKey
      if ((key.action === "layout" && !options.globe) || (key.action === "hide" && !options.hide)) {
        row.splice(index, 1)
        // The space bar takes the room the key left, as on phone keyboards.
        if (space) space.width += key.width
      }
    }
  }
  if (options.hide && !result.some((row) => row.some((key) => key.action === "hide"))) {
    const last = result[result.length - 1]
    const blank = options.grid ? last?.findIndex((key) => key.action === "gap") : -1
    if (last && blank !== undefined && blank >= 0) {
      // A grid (number pad) keeps its columns: the hide key takes the blank cell.
      last[blank] = { action: "hide", width: (last[blank] as NormalizedKey).width }
    } else if (last && !options.grid) {
      const space = last.find((key) => key.action === "space")
      if (space && space.width > 2) space.width -= 1
      last.push({ action: "hide", width: 1 })
    }
  }
  return result
}

function place(rows: NormalizedKey[][], layout: KeyboardLayout, reserve: number): { keys: PlacedKey[]; columns: number } {
  const widest = Math.max(layout.columns ?? 0, ...rows.map(rowUnits))
  const columns = Math.max(1, Math.round(widest * STEPS))
  const keys: PlacedKey[] = []
  // Rows sit at the bottom of the reserved height, so the space bar never moves between layers.
  const offset = Math.max(0, reserve - rows.length)
  rows.forEach((row, r) => {
    let start = layout.columns ? 1 : 1 + Math.round(((widest - rowUnits(row)) * STEPS) / 2)
    row.forEach((key, c) => {
      const span = Math.max(1, Math.round(key.width * STEPS))
      keys.push({ id: key.id ?? `${r}:${c}`, key, row: offset + r + 1, start, span })
      start += span
    })
  })
  return { keys, columns }
}

function textOf(key: NormalizedKey): string | undefined {
  if (key.action === "insert") return key.text
  if (key.action === "space") return key.text ?? " "
  return undefined
}

function display(text: string): string {
  // A lone combining mark (Arabic harakat) is drawn on a dotted circle, as keyboards do.
  return COMBINING.test(text) ? `◌${text}` : text
}

type Words = typeof onScreenKeyboardMessages.defaults

/** The name of a layer: the built-in layers' messages, else the key's label or the layer's name. */
function layerLabel(words: Words, name: string, fallback?: string): string {
  if (name === "symbols") return words.symbols
  if (name === "symbols2") return words.moreSymbols
  if (name === "default") return words.letters
  if (name === "katakana") return words.katakana
  return fallback ?? name
}

function hasAnyAlternates(layout: KeyboardLayout): boolean {
  return !!layout.alternates && Object.keys(layout.alternates).length > 0
}

/**
 * An on-screen keyboard for kiosks, TVs driven by a remote's arrow keys, touch screens where
 * the native keyboard is unsuitable, and search panels (the alphabet grid).
 *
 * Standalone it owns a text value (controlled or uncontrolled); with `target` it types into
 * an input, textarea or contenteditable element at its caret, firing `input` events so
 * React-controlled inputs update, without taking focus from it. Layouts are data
 * ({@link KeyboardLayout}): built-in layouts cover the major scripts, including Hangul
 * syllable composition and kana marks; the globe key cycles `layouts`.
 *
 * Keyboard: one tab stop; arrow keys move by the keys' positions on screen (so wide keys and
 * right-to-left layouts behave as they look); Home and End go to the row's ends; Enter or
 * Space presses the focused key; holding Enter, or holding a key with the pointer, offers
 * accented alternates; physical typing edits the text while focus is on the keyboard;
 * Escape calls `onEscape`. Layer, layout and Caps Lock changes are announced politely.
 */
export function OnScreenKeyboard({
  layout: layoutProp,
  layouts,
  onLayoutChange,
  value: valueProp,
  defaultValue,
  onValueChange,
  target,
  onKeyPress,
  onEnter,
  enterKind: enterKindProp,
  size = "md",
  variant: variantProp,
  captureTyping = true,
  wrap = false,
  onNavigateOut,
  onEscape,
  onHide,
  autoFocus = false,
  disabled = false,
  showAlternates = true,
  locale: localeProp,
  className,
  style,
  "aria-describedby": describedBy,
  ref,
  ...rest
}: OnScreenKeyboardProps) {
  const locale = useLocale(localeProp)
  const messages = useMessages(onScreenKeyboardMessages)
  const instructionsId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  // The caller's ref sees the root too: the keyboard needs its own for focus and measuring.
  const setRoot = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element
      if (typeof ref === "function") ref(element)
      else if (ref) ref.current = element
    },
    [ref],
  )

  // ── layouts ────────────────────────────────────────────────────────────────
  const cycleKey = layouts?.map((entry) => (typeof entry === "string" ? entry : entry.id)).join("|") ?? ""
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- the identifiers stand for the layouts
  const cycle = useMemo(() => (layouts ?? []).map((entry) => resolveKeyboardLayout(entry, locale)), [cycleKey, locale])
  const requested = resolveKeyboardLayout(layoutProp ?? cycle[0], locale)
  const [shown, setShown] = useState({ source: requested.id, layout: requested })
  let layout = shown.layout
  const [layer, setLayer] = useState("default")
  const [shift, setShift] = useState<ShiftState>("off")
  if (shown.source !== requested.id) {
    // A new layout from the application replaces the shown one, on its letters.
    layout = requested
    setShown({ source: requested.id, layout: requested })
    setLayer("default")
    setShift("off")
  }
  const lastShiftAt = useRef(0)
  const layerName = layout.layers[layer] ? layer : "default"
  const globe = cycle.length > 1
  const variant = variantProp ?? (layout.columns ? "grid" : "keys")

  // Reserve the tallest layer of the shown layout, so Shift and the symbol layers swap labels in
  // place. A layout the person switches to may be taller or shorter: reserving every layout in
  // the cycle would leave a blank band above most of them (kana has six rows).
  const reserve = useMemo(() => {
    let rows = 0
    for (const layerRowsOf of Object.values(layout.layers)) rows = Math.max(rows, layerRowsOf?.length ?? 0)
    return rows
  }, [layout])

  const { keys: placed, columns } = useMemo(
    () => place(adjustRows(layerRows(layout, layerName, shift !== "off"), { globe, hide: !!onHide, grid: !!layout.columns }), layout, reserve),
    [layout, layerName, shift, globe, onHide, reserve],
  )

  // ── value ──────────────────────────────────────────────────────────────────
  const [value, setValue] = useControllable(valueProp, defaultValue ?? "")
  const caret = useRef<{ value: string; start: number; end: number } | null>(null)
  const composing = useRef<{ value: string; at: number } | null>(null)
  const [targetHint, setTargetHint] = useState<string | null>(null)
  useEffect(() => {
    const element = resolveTarget(target)
    const hint = element?.getAttribute("enterkeyhint") ?? null
    if (hint !== targetHint) setTargetHint(hint)
  })
  const enterKind: EnterKind =
    enterKindProp ?? (targetHint && /^(search|go|done|next|send|enter)$/.test(targetHint) ? (targetHint as EnterKind) : "enter")

  // ── announcements ─────────────────────────────────────────────────────────
  const [announcement, setAnnouncement] = useState("")
  const announce = useCallback((text: string) => {
    // Repeating the same words still reaches the screen reader: the text changes.
    setAnnouncement((previous) => (previous === text ? `${text}\u00a0` : text))
  }, [])

  // ── focus ──────────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = placed.find((entry) => entry.id === activeId && entry.key.action !== "gap") ?? placed.find((entry) => entry.key.action !== "gap")
  const column = useRef<number | null>(null)
  const buttons = () => [...(rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-osk-key]") ?? [])]
  useEffect(() => {
    if (autoFocus) rootRef.current?.querySelector<HTMLButtonElement>('[data-osk-key][tabindex="0"]')?.focus()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- focus once, on mount
  }, [])

  // ── alternates ─────────────────────────────────────────────────────────────
  const [alternates, setAlternates] = useState<AlternatesState | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const hold = useRef<{ id: string; timer: ReturnType<typeof setTimeout> | null; repeat: ReturnType<typeof setInterval> | null; fired: boolean; pointer: number | null }>({
    id: "",
    timer: null,
    repeat: null,
    fired: false,
    pointer: null,
  })
  const swallowClick = useRef(false)
  const stopHold = useCallback(() => {
    const current = hold.current
    if (current.timer) clearTimeout(current.timer)
    if (current.repeat) clearInterval(current.repeat)
    hold.current = { id: "", timer: null, repeat: null, fired: false, pointer: null }
  }, [])
  useEffect(() => stopHold, [stopHold])
  const [pressedId, setPressedId] = useState<string | null>(null)

  // ── pressing ───────────────────────────────────────────────────────────────
  const latest = useRef({ layout, layerName, shift, value, target, onKeyPress, onEnter, onValueChange, onLayoutChange, onHide, cycle, messages })
  latest.current = { layout, layerName, shift, value, target, onKeyPress, onEnter, onValueChange, onLayoutChange, onHide, cycle, messages }

  const edit = useCallback(
    (key: NormalizedKey, details: KeyPressDetails, multiline: boolean | null) => {
      const { layout: current, value: own, onValueChange: report } = latest.current
      const element = resolveTarget(latest.current.target)
      const options: EditOptions & { multiline?: boolean } = { locale: current.locale, compose: current.compose }
      if (element) {
        const state = readTarget(element)
        if (state.disabled || state.readOnly) return
        const session = composing.current
        const result = applyKey(state, key, {
          ...options,
          maxLength: state.maxLength,
          multiline: multiline ?? state.multiline,
          composing: !!session && session.value === state.value && session.at === state.selectionStart,
        })
        if (!result) return
        writeTarget(element, result, state)
        composing.current = result.change && key.action !== "clear" ? { value: result.state.value, at: result.state.selectionStart } : null
        return
      }
      const known = caret.current && caret.current.value === own ? caret.current : null
      const state: EditState = { value: own, selectionStart: known?.start ?? own.length, selectionEnd: known?.end ?? own.length }
      const session = composing.current
      const result = applyKey(state, key, { ...options, multiline: !!multiline, composing: !!session && session.value === own && session.at === state.selectionStart })
      if (!result) return
      caret.current = { value: result.state.value, start: result.state.selectionStart, end: result.state.selectionEnd }
      composing.current = result.change && key.action !== "clear" ? { value: result.state.value, at: result.state.selectionStart } : null
      if (result.change) {
        setValue(result.state.value)
        report?.(result.state.value, details)
      }
    },
    [setValue],
  )

  const press = useCallback(
    (key: NormalizedKey, source: KeyPressSource) => {
      const state = latest.current
      if (key.action === "gap") return
      let prevented = false
      const details: KeyPressDetails = {
        key,
        layout: state.layout,
        layer: state.layerName,
        source,
        get defaultPrevented() {
          return prevented
        },
        preventDefault() {
          prevented = true
        },
      }
      state.onKeyPress?.(key, details)
      const typed = key.action === "insert" || key.action === "space"
      if (typed && state.shift === "once") setShift("off")
      if (prevented) return
      const words = state.messages
      switch (key.action) {
        case "shift": {
          const now = Date.now()
          if (state.shift === "off") {
            lastShiftAt.current = now
            setShift("once")
          } else if (state.shift === "once" && now - lastShiftAt.current < DOUBLE_SHIFT_MS) {
            setShift("lock")
            announce(words.capsLockOn)
          } else {
            if (state.shift === "lock") announce(words.capsLockOff)
            setShift("off")
          }
          return
        }
        case "layer":
        case "script": {
          const next = key.layer ?? "default"
          setLayer(next)
          setShift("off")
          announce(key.action === "script" ? (next === "default" ? words.hiragana : words.katakana) : words.layerChanged({ layer: layerLabel(words, next, key.label) }))
          return
        }
        case "layout": {
          const list = state.cycle
          if (list.length < 2) return
          const index = list.findIndex((entry) => entry.id === state.layout.id)
          const next = list[(index + 1) % list.length] as KeyboardLayout
          setShown((previous) => ({ ...previous, layout: next }))
          setLayer("default")
          setShift("off")
          composing.current = null
          state.onLayoutChange?.(next)
          announce(words.layoutChanged({ layout: next.label }))
          return
        }
        case "hide":
          state.onHide?.()
          return
        case "enter": {
          state.onEnter?.(details)
          if (prevented) return
          const element = resolveTarget(state.target)
          if (element && !readTarget(element).multiline) submitFromTarget(element)
          else if (element) edit(key, details, true)
          return
        }
        default:
          edit(key, details, null)
      }
    },
    [announce, edit],
  )

  const pressById = (id: string, source: KeyPressSource) => {
    const entry = placed.find((each) => each.id === id)
    if (entry) press(entry.key, source)
  }

  // ── alternates ─────────────────────────────────────────────────────────────
  const openAlternates = (entry: PlacedKey, keyboard: boolean) => {
    const list = alternatesFor(layout, textOf(entry.key))
    if (!list.length) return false
    setAlternates({ id: entry.id, base: entry.key, list, index: 0, keyboard })
    return true
  }
  const closeAlternates = (refocus: boolean) => {
    const id = alternates?.id
    setAlternates(null)
    if (refocus && id) rootRef.current?.querySelector<HTMLButtonElement>(`[data-osk-id="${CSS.escape(id)}"]`)?.focus()
  }
  const chooseAlternate = (index: number) => {
    if (!alternates) return
    const text = alternates.list[index]
    const keyboard = alternates.keyboard
    if (text) press({ action: "insert", text, width: 1 }, "alternate")
    closeAlternates(keyboard)
  }
  useLayoutEffect(() => {
    // Centre the strip over its key, inside the keyboard's width.
    const popup = popupRef.current
    const root = rootRef.current
    if (!alternates || !popup || !root) return
    const button = root.querySelector<HTMLElement>(`[data-osk-id="${CSS.escape(alternates.id)}"]`)
    const cap = button?.querySelector<HTMLElement>(".fa-osk-cap") ?? button
    if (!cap) return
    const box = root.getBoundingClientRect()
    const key = cap.getBoundingClientRect()
    const width = popup.offsetWidth
    const left = Math.min(Math.max(0, key.left - box.left + key.width / 2 - width / 2), Math.max(0, box.width - width))
    popup.style.left = `${left}px`
    popup.style.top = `${key.top - box.top - popup.offsetHeight}px`
    if (alternates.keyboard) popup.querySelector<HTMLElement>(`[data-index="${alternates.index}"]`)?.focus({ preventScroll: true })
  }, [alternates])

  // ── pointer ────────────────────────────────────────────────────────────────
  const onKeyPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, entry: PlacedKey) => {
    if (event.button !== 0 || disabled) return
    // Keep focus where it is: in the target, or on the keyboard key the person is on.
    event.preventDefault()
    if (rootRef.current?.contains(document.activeElement)) {
      event.currentTarget.focus({ preventScroll: true })
      setActiveId(entry.id)
    }
    column.current = null
    swallowClick.current = false
    stopHold()
    if (alternates) setAlternates(null)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A synthetic pointer has no capture.
    }
    setPressedId(entry.id)
    const current = { id: entry.id, timer: null as ReturnType<typeof setTimeout> | null, repeat: null as ReturnType<typeof setInterval> | null, fired: false, pointer: event.pointerId }
    hold.current = current
    if (entry.key.action === "backspace") {
      // Backspace acts on press and repeats while held.
      current.fired = true
      press(entry.key, "pointer")
      current.timer = setTimeout(() => {
        current.repeat = setInterval(() => press(entry.key, "pointer"), REPEAT_MS)
      }, HOLD_MS)
      return
    }
    const canHold = entry.key.action === "shift" || (showAlternates && alternatesFor(layout, textOf(entry.key)).length > 0)
    if (canHold)
      current.timer = setTimeout(() => {
        current.timer = null
        if (entry.key.action === "shift") {
          current.fired = true
          setShift("lock")
          announce(messages.capsLockOn)
        } else if (openAlternates(entry, false)) current.fired = true
      }, HOLD_MS)
  }

  const alternateAt = (x: number, y: number): number | null => {
    const popup = popupRef.current
    if (!popup) return null
    for (const option of popup.querySelectorAll<HTMLElement>("[data-index]")) {
      const box = option.getBoundingClientRect()
      if (x >= box.left && x <= box.right && y >= box.top - box.height && y <= box.bottom + box.height) return Number(option.dataset.index)
    }
    return null
  }

  const onKeyPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!alternates || hold.current.pointer !== event.pointerId) return
    const index = alternateAt(event.clientX, event.clientY)
    if (index !== null && index !== alternates.index) setAlternates({ ...alternates, index })
  }

  const onKeyPointerUp = (event: ReactPointerEvent<HTMLButtonElement>, entry: PlacedKey) => {
    const current = hold.current
    if (current.pointer !== event.pointerId) return
    const fired = current.fired
    stopHold()
    setPressedId(null)
    swallowClick.current = true
    // Clicks follow pointerup in the same task; afterwards a click (from assistive technology) is real.
    setTimeout(() => {
      swallowClick.current = false
    }, 0)
    if (alternates && alternates.id === entry.id && !alternates.keyboard) {
      const index = alternateAt(event.clientX, event.clientY)
      if (index !== null) chooseAlternate(index)
      else setAlternates(null)
      return
    }
    if (fired) return
    const box = event.currentTarget.getBoundingClientRect()
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
    // A press counts where it is released, as on phone keyboards.
    if (inside) press(entry.key, "pointer")
  }

  const onKeyPointerCancel = () => {
    stopHold()
    setPressedId(null)
  }

  // ── keyboard ───────────────────────────────────────────────────────────────
  const move = (from: HTMLButtonElement, direction: NavigationDirection) => {
    const all = buttons()
    const index = all.indexOf(from)
    const rects = all.map((button) => button.getBoundingClientRect())
    const vertical = direction === "up" || direction === "down"
    if (vertical && column.current === null) {
      const rect = rects[index]
      if (rect) column.current = (rect.left + rect.right) / 2
    }
    if (!vertical) column.current = null
    const next = nextKeyIndex(rects, index, direction, { wrap, column: vertical ? (column.current ?? undefined) : undefined })
    if (next === null) {
      onNavigateOut?.(direction)
      return
    }
    const button = all[next]
    if (button) {
      setActiveId(button.dataset.oskId ?? null)
      button.focus()
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    rest.onKeyDown?.(event)
    if (event.defaultPrevented || disabled) return
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-osk-key]")
    if (!button || !rootRef.current?.contains(button)) return
    const id = button.dataset.oskId ?? ""
    const entry = placed.find((each) => each.id === id)
    if (!entry) return
    const directions: Record<string, NavigationDirection> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }
    const direction = directions[event.key]
    if (direction) {
      event.preventDefault()
      move(button, direction)
      return
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      const all = buttons()
      const index = all.indexOf(button)
      const grid = button.parentElement ?? button
      const edge = rowEdgeIndex(
        all.map((each) => each.getBoundingClientRect()),
        index,
        event.key === "Home" ? "start" : "end",
        isRtl(grid),
      )
      column.current = null
      const next = all[edge]
      if (next) {
        setActiveId(next.dataset.oskId ?? null)
        next.focus()
      }
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (event.repeat) return
      stopHold()
      const current = { id, timer: null as ReturnType<typeof setTimeout> | null, repeat: null, fired: false, pointer: null }
      hold.current = current
      setPressedId(id)
      if (showAlternates && event.key === "Enter" && alternatesFor(layout, textOf(entry.key)).length)
        current.timer = setTimeout(() => {
          current.timer = null
          if (openAlternates(entry, true)) {
            current.fired = true
            setPressedId(null)
          }
        }, HOLD_MS)
      return
    }
    if (event.key === "Escape") {
      if (onEscape) {
        event.preventDefault()
        onEscape()
      }
      return
    }
    if (!captureTyping || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || (event.altKey && !event.getModifierState("AltGraph"))) return
    if (event.key === "Backspace") {
      event.preventDefault()
      press({ action: "backspace", width: 1 }, "typing")
      return
    }
    if ([...event.key].length === 1 && event.key !== " ") {
      event.preventDefault()
      press({ action: "insert", text: event.key, width: 1 }, "typing")
    }
  }

  const onKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    rest.onKeyUp?.(event)
    if (event.key !== "Enter" && event.key !== " ") return
    const current = hold.current
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-osk-key]")
    if (!button || current.pointer !== null || current.id !== button.dataset.oskId) return
    const fired = current.fired
    stopHold()
    setPressedId(null)
    event.preventDefault()
    if (!fired) pressById(current.id, "keyboard")
  }

  const onAlternatesKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!alternates) return
    event.stopPropagation()
    const key = readingKey(event.key, event.currentTarget)
    const count = alternates.list.length
    if (key === "ArrowRight" || key === "ArrowLeft") {
      event.preventDefault()
      const index = (alternates.index + (key === "ArrowRight" ? 1 : -1) + count) % count
      setAlternates({ ...alternates, index })
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      setAlternates({ ...alternates, index: event.key === "Home" ? 0 : count - 1 })
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (!event.repeat) chooseAlternate(alternates.index)
    } else if (event.key === "Escape" || event.key === "Tab" || event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      closeAlternates(true)
    }
  }

  // ── rendering ──────────────────────────────────────────────────────────────
  const nextLayout = globe ? cycle[(cycle.findIndex((entry) => entry.id === layout.id) + 1) % cycle.length] : undefined
  const anyAlternates = showAlternates && hasAnyAlternates(layout)

  const renderKey = (entry: PlacedKey, isActive: boolean) => {
    const { key } = entry
    const placement: CSSProperties = { gridRow: entry.row, gridColumn: `${entry.start} / span ${entry.span}` }
    if (key.action === "gap") return <span key={entry.id} className="fa-osk-gap" style={placement} aria-hidden />
    let label: ReactNode
    let name: string | undefined
    let role: "char" | "function" | "accent" = "function"
    let pressed: boolean | undefined
    let lang: string | undefined
    let preview: string | undefined
    const text = textOf(key)
    switch (key.action) {
      case "insert": {
        role = "char"
        lang = layout.locale
        const shown = key.label ?? display(text ?? "")
        label = (
          <>
            <span className="fa-osk-label">{shown}</span>
            {key.hint ? (
              <span className="fa-osk-hint" aria-hidden>
                {key.hint}
              </span>
            ) : null}
          </>
        )
        if (shown !== text) name = text
        if (!layout.masked && [...shown].length <= 2) preview = shown
        break
      }
      case "space":
        role = variant === "grid" ? "function" : "char"
        name = messages.space
        label =
          variant === "grid" ? (
            <span className="fa-osk-space-glyph" aria-hidden />
          ) : (
            <span className="fa-osk-space-label" dir="auto" aria-hidden>
              {key.label ?? layout.label}
            </span>
          )
        break
      case "backspace":
        name = messages.backspace
        label = <IconBackspace />
        break
      case "shift":
        name = shift === "lock" ? messages.capsLock : messages.shift
        pressed = shift !== "off"
        label = shift === "lock" ? <IconCapsLock /> : <IconShift />
        break
      case "enter":
        name = messages[enterKind]
        role = enterKind === "enter" ? "function" : "accent"
        label =
          enterKind === "enter" ? (
            <IconReturn />
          ) : enterKind === "search" ? (
            <IconSearch />
          ) : enterKind === "send" ? (
            <IconSend />
          ) : (
            <span className="fa-osk-text" dir="auto" aria-hidden>
              {messages[enterKind]}
            </span>
          )
        break
      case "layer": {
        const to = key.layer ?? "default"
        name = layerLabel(messages, to, key.label)
        label = (
          <span className="fa-osk-text" dir="auto" aria-hidden>
            {key.label ?? (to === "symbols" ? messages.symbolsKey : to === "symbols2" ? messages.moreSymbolsKey : to === "default" ? messages.lettersKey : to)}
          </span>
        )
        break
      }
      case "script":
        name = (key.layer ?? "default") === "default" ? messages.hiragana : messages.katakana
        label = (
          <span className="fa-osk-text" lang={layout.locale} aria-hidden>
            {key.label}
          </span>
        )
        break
      case "layout":
        name = nextLayout ? messages.switchLayout({ layout: nextLayout.label }) : undefined
        label = <IconGlobe />
        break
      case "hide":
        name = messages.hide
        label = <IconKeyboardHide />
        break
      case "clear":
        name = messages.clear
        label = (
          <span className="fa-osk-text" dir="auto" aria-hidden>
            {key.label ?? messages.clear}
          </span>
        )
        break
      case "left":
      case "right":
        name = key.action === "left" ? messages.moveLeft : messages.moveRight
        label = key.action === "left" ? <IconChevronLeft /> : <IconChevronRight />
        break
      case "dakuten":
      case "handakuten":
      case "small":
        name = key.action === "small" ? messages.smallKana : messages[key.action]
        label = (
          <span className="fa-osk-label" lang={layout.locale} aria-hidden>
            {key.label}
          </span>
        )
        break
    }
    const marked = anyAlternates && !!text && alternatesFor(layout, text).length > 0
    return (
      <button
        key={entry.id}
        type="button"
        className="fa-osk-key"
        style={placement}
        data-osk-key=""
        data-osk-id={entry.id}
        data-action={key.action}
        data-role={role}
        data-pressed={pressedId === entry.id ? "" : undefined}
        data-state={key.action === "shift" ? shift : undefined}
        data-preview={preview}
        aria-pressed={pressed}
        aria-label={key.action === "insert" ? name : undefined}
        lang={lang}
        tabIndex={isActive ? 0 : -1}
        disabled={disabled}
        onFocus={() => setActiveId(entry.id)}
        onPointerDown={(event) => onKeyPointerDown(event, entry)}
        onPointerMove={onKeyPointerMove}
        onPointerUp={(event) => onKeyPointerUp(event, entry)}
        onPointerCancel={onKeyPointerCancel}
        onLostPointerCapture={() => setPressedId((current) => (current === entry.id ? null : current))}
        onMouseDown={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false
            return
          }
          // Assistive technology activates keys with a click and no pointer.
          press(entry.key, "keyboard")
        }}
      >
        <span className="fa-osk-cap">
          {label}
          {marked ? <span className="fa-osk-mark" aria-hidden /> : null}
        </span>
        {name && key.action !== "insert" ? <VisuallyHidden>{name}</VisuallyHidden> : null}
      </button>
    )
  }

  const altBase = alternates ? (textOf(alternates.base) ?? "") : ""

  return (
    <div
      {...rest}
      ref={setRoot}
      role="group"
      aria-label={rest["aria-label"] ?? (rest["aria-labelledby"] ? undefined : messages.keyboard({ layout: layout.label }))}
      aria-describedby={cx(describedBy, instructionsId)}
      className={cx("fa-osk", className)}
      data-size={size}
      data-variant={variant}
      data-layout={layout.id}
      data-layer={layerName}
      data-disabled={disabled ? "" : undefined}
      data-print="hide"
      style={{ ...style, "--_cols": columns, "--_rows": reserve } as CSSProperties}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div className="fa-osk-grid" dir={layout.arrangement === "physical" ? "ltr" : undefined}>
        {placed.map((entry) => renderKey(entry, entry === active))}
      </div>
      {alternates ? (
        <div
          ref={popupRef}
          className="fa-osk-alternates"
          role="listbox"
          aria-label={messages.alternatesFor({ key: altBase })}
          aria-orientation="horizontal"
          dir={layout.arrangement === "physical" ? "ltr" : undefined}
          onKeyDown={onAlternatesKeyDown}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAlternates(null)
          }}
          onPointerDown={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
        >
          {alternates.list.map((char, index) => (
            <div
              key={char}
              role="option"
              className="fa-osk-alternate"
              lang={layout.locale}
              aria-selected={index === alternates.index}
              data-active={index === alternates.index ? "" : undefined}
              data-index={index}
              tabIndex={-1}
              onPointerEnter={() => setAlternates({ ...alternates, index })}
              onClick={() => chooseAlternate(index)}
            >
              {display(char)}
            </div>
          ))}
        </div>
      ) : null}
      <VisuallyHidden id={instructionsId}>{messages.instructions}</VisuallyHidden>
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
    </div>
  )
}
