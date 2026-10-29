# EditableAvatar

An avatar the person can change: the edit button (or, below `xl`, the avatar itself)
opens `AvatarDialog`, and a photo dropped on the avatar opens it with that photo ready to
crop. The application saves the result in `onSave`.

`import { EditableAvatar } from "glass-ux/avatar"`

[Live examples](https://dastari.github.io/glass-ux/components/editable-avatar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| dialogTitle | `ReactNode` | See type | no | — | Dialog title. Default "Change photo". |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| editPlacement | `"top-end" \| "top-start" \| undefined` | "top-end", "top-start" | no | "top-end" | The edit button's corner. Default `top-end` (top right in left-to-right languages). |
| name | `string` | See type | yes | — | The person's (or account's) name: the initials, tint and accessible names. |
| onReject | `((rejection: AvatarRejection) => void) \| undefined` | See type | no | — | Called for each file refused by the requirements. |
| onRemove | `(() => unknown) \| undefined` | See type | no | — | Remove the photo; the avatar shows initials until `src` changes. Without it there is no Remove button. |
| onSave | `(change: AvatarChange, context: AvatarSaveContext) => unknown` | See type | yes | — | Save the photo (see `AvatarDialog`). Once it resolves the avatar shows the new photo straight away, until `src` changes to the application's URL for it. |
| output | `AvatarOutput \| undefined` | See type | no | — | The cropped image: size in pixels (default 512), media type (default WebP) and quality. |
| presence | `Presence \| undefined` | "online", "away", "busy", "offline" | no | — | The person’s live availability, drawn as a presence indicator. |
| requirements | `AvatarRequirements \| undefined` | See type | no | — | What a photo must satisfy: types, bytes, minimum dimensions and the application's own check. |
| size | `AvatarSize \| undefined` | "xs", "sm", "md", "lg", "xl", "2xl" | no | "2xl" | Default `2xl` (96px). From `xl` up an edit button sits on the corner; smaller avatars are the button themselves. |
| src | `string \| undefined` | See type | no | — | The current photo URL. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
