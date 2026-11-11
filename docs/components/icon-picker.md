# Icon picker

`glass-ux/icon-picker` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/icon-picker)

Lets a person give something an icon from the set: a category, an asset type, a list. The value is
the icon's name (`"forklift"`), so it stores as a string and draws again from the catalogue.

```tsx
import { IconField, iconCatalogue } from "glass-ux/icon-picker"

const schema = z.object({ icon: z.string().nullable() })

<form.AppField name="icon">{() => <IconField label="Icon" clearable />}</form.AppField>

// Where the item is shown:
const Icon = iconCatalogue.find((entry) => entry.name === assetType.icon)?.Icon
```

- **Parts:** `IconField` (bound to a `string | null` form field), `IconInput` (the same box
  without a form: `value`, `defaultValue`, `onValueChange`), and `IconPicker` (the search and
  grid on their own, for a panel or popover of your own).
- **The catalogue:** `iconCatalogue` lists every icon in `glass-ux/icons` with its `name`, `Icon`,
  `group` (`ICON_GROUPS` gives each group's names in order) and `keywords`, the words people use
  for it. `searchIcons(query, entries)` is the picker's search: names first, then names and words
  that contain the query ("GPU" finds `ground-power`, "truck" finds `supplier`). Importing either
  brings in the whole set; import icons by name everywhere else.
- **Offering fewer:** `icons` takes any list of entries, such as
  `iconCatalogue.filter((entry) => entry.group === "vehicles")`.
- **Keyboard:** the grid is one tab stop. Arrow keys move through it in reading order, Home and
  End go to its ends, Enter or Space picks, and typing returns to the search. ↓ enters the grid
  from the search, and Enter there picks the first result. The grid opens on the chosen icon.
- **Clearing:** `clearable` adds No icon under the grid, which sets the value to null.
- Names are the icons' own (English) names; the search matches English words. The picker's own
  words (its labels, the result count) come from the language packs.
