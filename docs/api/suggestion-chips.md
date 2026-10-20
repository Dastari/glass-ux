# SuggestionChips

Prompt suggestions as glass pills: one tap puts the prompt in the composer.

`import { SuggestionChips } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/suggestion-chips)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| undefined` | "center", "start" | no | "center" | Centre them (the landing) or start-align them (a scoped pane). |
| onSelect | `(suggestion: Suggestion) => void` | See type | yes | — | Called with the suggestion whose pill is pressed; the host normally puts its `prompt` in the composer. |
| suggestions | `Suggestion[]` | See type | yes | — | Initial or ranked choices offered before a search. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
