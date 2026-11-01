# EmojiPicker

A searchable emoji picker drawn in the system font, so it ships no images. The list is one
tab stop: arrow keys move through the wrapped grid in reading order, Home and End go to its
ends, Enter or Space picks, and typing returns to the search. ↓ enters the list from the
search, and Enter there picks the first result.

The data loads on demand when the picker first renders: about 23 KB after gzip for Emoji
15.0's 1,870 emoji. Names and search are English unless `loadNames` supplies the locale's.
An emoji newer than the operating system's font draws as an empty box.

`import { EmojiPicker } from "glass-ux/emoji-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/emoji-picker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| autoFocus | `boolean \| undefined` | false, true | no | false | Focus the search when the picker has loaded. |
| defaultSkinTone | `EmojiSkinTone \| undefined` | 0, 1, 2, 3, 4, 5 | no | 0 | The skin tone at first when uncontrolled. Default 0. |
| loadNames | `((locale: string) => Promise<Readonly<Record<string, string>>>) \| undefined` | See type | no | — | Names for the current locale, by emoji without a tone: the name shown and searched, with any keywords after it. Without this names are English, and a search matches English only. The application supplies them, so no language's data ships in the library. |
| onPick | `(pick: EmojiPick) => void` | See type | yes | — | Called with the emoji a person picks by click, Enter or Space. |
| onSkinToneChange | `((tone: EmojiSkinTone) => void) \| undefined` | See type | no | — | Called with the tone a person chooses. |
| recent | `readonly string[] \| undefined` | See type | no | — | Emoji to offer first, in a Recent tab. The host keeps this list; without it there is no tab. |
| skinTone | `EmojiSkinTone \| undefined` | 0, 1, 2, 3, 4, 5 | no | — | The skin tone, controlled: 0 for none, 1 (light) to 5 (dark). |
| skinTones | `boolean \| undefined` | false, true | no | true | Offer the skin tone menu. Sequences with two people have no tone. Default true. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
