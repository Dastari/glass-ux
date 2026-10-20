# ConversationLog

The conversation: a scrolling log on a centred reading column, with the composer floating
over its bottom edge.

Column    a reading column (--reading-column) centred in the log, the convention every chat
          follows (R5.4). Wide blocks (tables, charts, code, images) break out wider,
          centred on the text, up to --reading-column-wide and never past the log. Spare
          width is for the context panel beside the log, never for longer lines.
Composer  floats over the transcript in glass-overlay, a small gap from the bottom, on the
          column. The log runs the full height behind it; its end is padded by the
          composer's measured height, so the last message scrolls clear of it, and growing
          the composer never moves what you read (if you were at the end, you stay there).
Asks      pending asks are pinned in the ask dock directly above the composer (R13.8); the
          transcript holds a marker at the ask's place. "Scroll to end" floats above both
          while you are not at the end.
Landing   with `landing` set, the hero, composer and suggestions sit in the middle. The first
          message clears it and the same composer (focus, caret, attachments intact) moves
          to the bottom with a FLIP transition on --duration-slower; instant with motion off.
Pinning   while the reader is at the bottom, new content keeps the bottom in view, so
          streaming text, folding asks and arriving results move what is above, never the
          newest lines. Scrolled up, nothing moves: the pill says "New messages" (R9.4).
A11y      role="log" without per-token chatter: completed answers are announced through
          one polite live region; the scroller is keyboard scrollable (R20.6).

`import { ConversationLog } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/conversation-log)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| announcement | `string \| undefined` | See type | no | — | Polite announcement for completed answers (never per token). |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| footer | `ReactNode` | See type | no | — | Floats over the bottom of the log on the reading column: the composer. |
| label | `string \| undefined` | See type | no | "Conversation" | Accessible name. |
| landing | `ReactNode` | See type | no | — | The empty conversation: shown centred above the composer until the first message (the hero). While set, the composer sits with it in the middle; when it clears, the same composer moves to its floating place at the bottom. |
| landingFooter | `ReactNode` | See type | no | — | Under the composer on the landing: suggestions. |
| surface | `AiSurface \| undefined` | "canvas", "panel", "float" | no | "panel" | canvas: the full-page conversation · panel: docked panes, windows, the gallery. |
| turns | `TurnAnchor[] \| undefined` | See type | no | — | Prompts for the turn navigator (shown when the log is wide enough). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
