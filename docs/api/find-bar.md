# FindBar

A find control for logs, tables and long documents. It holds no search logic: the host
owns matching and tells the bar how many matches there are, which one is current and
whether the count is still climbing. Options come through the `toggles` slot.

Stability  the count's width is reserved, so a climbing count moves nothing (R9.1). Past
           9,999 it abbreviates to stay inside that width.
Announce   the outcome goes to a polite region that stays mounted, once it settles; the
           ticking count never does (R20.9).
Keys       Enter next · Shift+Enter previous · Esc closes and returns focus (R20.3).
           In the replace field Enter replaces the current match.
Width      below 28rem the options and count take a second row.

`import { FindBar } from "glass-ux/find-bar"`

[Live examples](https://dastari.github.io/glass-ux/components/find-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name of the search landmark. Default "Find". |
| autoFocus | `boolean \| undefined` | false, true | no | — | Focus the term and select it on mount. It is always focused when `open` turns true. Default false. |
| className | `string \| undefined` | See type | no | — | Layout classes. |
| defaultOpen | `boolean \| undefined` | false, true | no | true | The initial state when uncontrolled. Default true. |
| defaultReplaceOpen | `boolean \| undefined` | false, true | no | false | The initial state when uncontrolled. Default false. |
| defaultReplaceValue | `string \| undefined` | See type | no | "" | The initial replacement when uncontrolled. Default empty. |
| defaultValue | `string \| undefined` | See type | no | "" | The initial term when uncontrolled. Default empty. |
| floating | `boolean \| undefined` | false, true | no | — | Float at the top end of the nearest positioned ancestor, on overlay glass. Put that ancestor around the scroller, not inside it: the bar stays clear of the scroll edge and the scrollbar, and the scroller needs `scroll-padding-block-start` so a revealed match is not left under it. Default false, for a bar in the page flow. |
| inputRef | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the term's input. |
| matchCount | `number \| undefined` | See type | no | — | Matches found so far. Leave undefined until there is something to count. |
| matchIndex | `number \| undefined` | See type | no | — | The current match, counted from 0. Leave undefined when none is current. |
| onNext | `(() => void) \| undefined` | See type | no | — | Move to the next match: the button, or Enter in the term. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when Escape or the close button asks to close. |
| onPrevious | `(() => void) \| undefined` | See type | no | — | Move to the previous match: the button, or Shift+Enter in the term. |
| onReplace | `((replacement: string) => void) \| undefined` | See type | no | — | Replace the current match. Supplying it, or `onReplaceAll`, offers the replace row. |
| onReplaceAll | `((replacement: string) => void) \| undefined` | See type | no | — | Replace every match. |
| onReplaceOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when the disclosure button is pressed. |
| onReplaceValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the replacement on every edit. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the term on every edit. The host runs the search. |
| open | `boolean \| undefined` | false, true | no | — | Whether the bar is showing, controlled. |
| replaceOpen | `boolean \| undefined` | false, true | no | — | Whether the replace row is showing, controlled. |
| replaceValue | `string \| undefined` | See type | no | — | The replacement text, controlled. |
| returnFocusRef | `RefObject<HTMLElement \| null> \| undefined` | See type | no | — | Where focus goes on closing. Default: the element that had focus before the bar did. |
| searching | `boolean \| undefined` | false, true | no | — | The search is still running, so `matchCount` may climb. The count shows "128+" and is announced only once it settles. |
| toggles | `ReactNode` | See type | no | — | Search options, usually pressed icon buttons for case, whole word and pattern. The host owns their state and their meaning. |
| value | `string \| undefined` | See type | no | — | The search term, controlled. |
