# Composer

Where the person writes. The text grows from one row to ten, then scrolls. Attachments and
context sit above it as chips; the toolbar below holds Attach, the workspace model (shown,
not chosen: it is set in AI settings), Context, dictation and the send circle, which turns
into Stop while a run is active. The conversation's status line can sit under the toolbar.

Material   the surface's (useCardMaterial): floating over a conversation it is
           glass-overlay, so the transcript scrolling behind it never shows through.

Keys   Enter sends · Shift+Enter new line · ↑ in an empty composer edits the last prompt ·
       Esc stops the run or closes a menu · / opens commands · @ mentions an entity.
Width  container-aware down to the docked pane: labels drop to icons, the model chip folds.

`import { Composer } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/composer)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| accept | `string \| undefined` | See type | no | — | Accepted file types for Attach (GlassUxAiAttachmentConfiguration.SupportedFormats). |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| attachments | `AiAttachment[] \| undefined` | See type | no | [] | Attachments selected for the message. |
| autoFocus | `boolean \| undefined` | false, true | no | false | Focus the text on mount. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| commands | `SlashCommand[] \| undefined` | See type | no | [] | Available slash commands and their typed arguments. |
| context | `EntityRef[] \| undefined` | See type | no | [] | The conversation's scope and references, as chips above the text. |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| dictationPreview | `number \| undefined` | See type | no | — | Gallery: show the dictation state with this input level (0–1). |
| disabledReason | `string \| undefined` | See type | no | — | Why nothing can be sent (budget used, provider unavailable). Keeps the box, disables it. |
| maxRows | `number \| undefined` | See type | no | 10 | Rows before the composer scrolls. |
| minRows | `number \| undefined` | See type | no | 1 | Rows shown when empty (the landing composer uses 2). |
| model | `ComposerModel \| undefined` | See type | no | — | The workspace's model: read-only here, set in AI settings. |
| onAttach | `((files: File[]) => void) \| undefined` | See type | no | — | Called when attach occurs. The callback type specifies its arguments. |
| onContextChange | `((context: EntityRef[]) => void) \| undefined` | See type | no | — | Called when context change occurs. The callback type specifies its arguments. |
| onEditLast | `(() => void) \| undefined` | See type | no | — | ↑ in an empty composer edits the last prompt. |
| onOpenSettings | `(() => void) \| undefined` | See type | no | — | Called when open settings occurs. The callback type specifies its arguments. |
| onRemoveAttachment | `((id: string) => void) \| undefined` | See type | no | — | Called when remove attachment occurs. The callback type specifies its arguments. |
| onSend | `((text: string) => void \| Promise<void>) \| undefined` | See type | no | — | Called with the trimmed text; clear the composer by resolving. |
| onStop | `(() => void) \| undefined` | See type | no | — | Called when stop occurs. The callback type specifies its arguments. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| placeholder | `string \| undefined` | See type | no | "Ask Assistant…" | The prompt shown while the value is empty. It does not replace the field’s label. |
| run | `RunState \| undefined` | "idle", "running", "sending", "stopping" | no | "idle" | Operation invoked by the component. |
| size | `"md" \| "lg" \| undefined` | "md", "lg" | no | "md" | md: conversations and panes · lg: the landing hero (bigger send circle). |
| status | `ReactNode` | See type | no | — | The conversation's status line (AiStatusStrip), the last row inside the composer. |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
