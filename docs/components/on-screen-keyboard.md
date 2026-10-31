# On-screen keyboard

`glass-ux/on-screen-keyboard` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Keys for kiosks, TVs driven by a remote's arrow keys, touch screens where the device keyboard
is unsuitable, and search panels (the alphabet grid). The keyboard brings no surface or padding:
put it in a `Surface` or `Panel`, or use `KeyboardDrawer` or `KeyboardPopover`, which supply
the material and insets.

```tsx
import { OnScreenKeyboard } from "glass-ux/on-screen-keyboard"

// Type into an input at its caret; the input keeps focus.
const field = useRef<HTMLInputElement>(null)
<Input ref={field} aria-label="Message" enterKeyHint="send" />
<OnScreenKeyboard layout="qwerty" target={field} />

// Or own the text (a TV search, a PIN pad).
<OnScreenKeyboard layout="alphabet" size="lg" value={query} onValueChange={setQuery} onNavigateOut={moveToResults} />
```

- **Value:** standalone, `value`/`defaultValue`/`onValueChange(value, details)`; with `target`
  (an input, textarea or contenteditable element, or a ref) the keyboard edits the element and
  fires `input` events, so React-controlled inputs update. Pointer presses never take focus.
- **Layouts:** `layout` takes a built-in identifier or a `KeyboardLayout`; the default follows
  the locale (`layoutForLocale`). `layouts` adds a globe key that cycles them
  (`onLayoutChange`). Built in: `alphabet`, `qwerty`, `qwertz`, `azerty`, `spanish`,
  `portuguese`, `italian`, `nordic`, `russian`, `greek`, `arabic`, `hebrew`, `kana`,
  `hangul`, `numeric`, `decimal`, `pin`, `phone`, `email`, `url`. Arabic, Hebrew and the
  other typing layouts keep their physical left-to-right geometry in right-to-left documents.
  Hangul jamo compose into syllables and kana take dakuten, handakuten and small forms; kanji
  and pinyin conversion need an input method and are out of scope.
- **Enter:** `enterKind` (`enter`, `search`, `go`, `done`, `next`, `send`) defaults to the
  target's `enterkeyhint`. Unless `onEnter` calls `details.preventDefault()`, an input target's
  form is submitted and a textarea gets a new line.
- **Keyboard:** one tab stop. Arrow keys move by the keys' positions on screen, Home and End go
  to the row's ends, Enter or Space presses the focused key, and physical typing edits the text
  while focus is on the keyboard. At an edge an arrow calls `onNavigateOut(direction)` (screen
  direction), so a TV layout can move focus to the results beside it; `wrap` continues from the
  far side instead. Holding a key (500 ms) or Enter offers accented alternates.
- **Sizes and variants:** `size` sm (narrow panels), md (default), lg (TV, with a thick ring
  and a lift on focus). `variant` keys (keycaps) or grid (flat tiles: the default for the
  alphabet and number pads). Rows keep a fixed height, so Shift and layer changes never move a
  key.

## Linking to inputs

`OnScreenKeyboardProvider` serves every input inside a `KeyboardTarget` with one keyboard,
without changing the inputs' components.

```tsx
<OnScreenKeyboardProvider show="focus" container={kioskFrame}>
  <KeyboardTarget>
    <Field label="Email"><Input type="email" /></Field>
  </KeyboardTarget>
  <KeyboardToggle />
</OnScreenKeyboardProvider>
```

- `show="focus"` opens the keyboard when a linked input gains focus; `manual` (default) opens it
  only through `useOnScreenKeyboard().open()` or `KeyboardToggle`.
- `presentation` is `drawer` (default) or `popover`. The layout follows each input's
  `inputmode` or `type` (number pads for numeric and tel, email, url) unless the
  `KeyboardTarget` sets one.
- `replaceNative` (`touch` by default) sets `inputmode="none"` on the served input so the
  device keyboard stays closed, and restores it afterwards.
- `KeyboardDrawer` docks to the viewport's bottom edge, or to `container`. While open it sets
  `--keyboard-inset-height` on its scroll root: pad the scroll container's content with
  `var(--keyboard-inset-height, 0px)` so the last field can rise above it.
- `KeyboardPopover` floats beside its `target`, flips when there is no room and closes on a
  press outside.
- Escape in the input or on the keyboard, and the hide key, close both containers. Closing
  never moves focus.

**Parts:** `OnScreenKeyboard`, `KeyboardDrawer`, `KeyboardPopover`, `OnScreenKeyboardProvider`,
`KeyboardTarget`, `KeyboardToggle`, `useOnScreenKeyboard`, `keyboardLayouts`,
`defineKeyboardLayout`, `layoutForLocale`, `alphabetLayout`, `resolveKeyboardLayout`; the pure
editing, composition and navigation helpers `applyKey`, `applyEdit`, `editForKey`,
`hangulInput`, `hangulBackspace`, `kanaModify`, `toHiragana`, `toKatakana`, `nextKeyIndex`,
`rowEdgeIndex`.
