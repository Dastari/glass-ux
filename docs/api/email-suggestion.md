# EmailSuggestion

"Did you mean avery@gmail.com?" for the field's message line; choosing it replaces the value.

`import { EmailSuggestion } from "glass-ux/email-field"`

[Live examples](https://dastari.github.io/glass-ux/components/email-suggestion)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onAccept | `(suggestion: string) => void` | See type | yes | — | Called with `suggestion` when the hint is pressed, to replace the typed address with it. |
| suggestion | `string` | See type | yes | — | The address someone probably meant ("avery@gmail.com"). |
