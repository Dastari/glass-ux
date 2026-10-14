# SuggestionChips

Prompt suggestions as glass pills: one tap puts the prompt in the composer.

`import { SuggestionChips } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/suggestion-chips)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| undefined` | "center", "start" | no | "center" | Centre them (the landing) or start-align them (a scoped pane). |
| onSelect | `(suggestion: Suggestion) => void` | See type | yes | — | Called when select occurs. The callback type specifies its arguments. |
| suggestions | `Suggestion[]` | See type | yes | — | Initial or ranked choices offered before a search. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
