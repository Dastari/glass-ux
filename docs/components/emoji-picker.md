# EmojiPicker

`glass-ux/emoji-picker` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/emoji-picker)

A searchable emoji list drawn in the system font, so it ships no images.

```tsx
import { EmojiPicker, EmojiPopover } from "glass-ux/emoji-picker"

<EmojiPicker recent={recent} onPick={({ emoji }) => insert(emoji)} />

<EmojiPopover trigger={<Button icon={<IconSmile />}>Emoji</Button>} onPick={({ emoji }) => insert(emoji)} />
```

- **Keyboard.** The list is one tab stop (R11.5): arrow keys move through the grid in reading order
  by the columns its box allows, Home and End go to the ends, and Enter or Space picks. Typing
  returns to the search. ↓ enters the list from the search, and Enter there picks the first result.
- **Recent.** The host keeps `recent`; the picker reports picks through `onPick`. Without it there
  is no Recent tab.
- **Skin tone.** `skinTone` or `defaultSkinTone`, 0 for none and 1 (light) to 5 (dark). It applies
  to emoji with one person; sequences with two people take none. `skinTones={false}` removes the menu.
- **States.** Loading, a failed load with Retry, and an empty search that names the query all use
  the picker's fixed box.

## Names and search are in English

The data holds English CLDR names and two keywords per emoji. Search matches English, and option
names read in English, unless the application supplies names for the locale:

```tsx
<EmojiPicker loadNames={(locale) => import(`./emoji-names.${locale}.json`).then((m) => m.default)} onPick={insert} />
```

`loadNames` resolves to the name and any keywords, by emoji without a tone. The English stays
searchable beside them. No other language's data ships with the library.

## Size

The data is Emoji 15.0's 1,870 emoji in a few strings: 67 KB of source, 23.6 KB after gzip. It loads
when a picker first renders, and `pnpm size:check` forbids it from every entry's initial chunk.
`EmojiPopover` also loads the picker's code on opening. The set stops at Emoji 15.0 because the
glyph comes from the operating system: a newer emoji would draw as an empty box on an older one.

`pnpm emoji` regenerates the data from two development dependencies; never edit it by hand.
