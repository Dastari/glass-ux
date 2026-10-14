# Theme and layout contract

Use the component's geometry props and content slots. `Surface` supplies the selected
material, radius and padding; `Panel.Header`, `Panel.Body` and `Panel.Footer` supply their
own insets. Drawer search and body slots also own their spacing. Adding a glass material
class to an arbitrary element supplies appearance only, without those layout defaults.

| Purpose                        | Use                                                    | Theme role                          |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------- |
| Navigation pane                | `Surface material="chrome" padding="panel"`            | `--inset-panel`, `--radius-surface` |
| Content pane                   | `Panel` with `PanelHeader` and `PanelBody`             | `--inset-panel`, `--radius-surface` |
| Many catalogue or board cards  | `Surface material="card" radius="tile" padding="tile"` | `--inset-tile`, `--radius-tile`     |
| Group heading and page framing | Plain semantic elements on the canvas                  | `--gap-panels`, `--gap-section`     |
| Documentation article          | Centered, padded scrolling document                    | `--inset-panel`, `--measure`        |

`padding="none"` is Surface's default so compound content slots do not get double padding.
Choose padding explicitly when placing content directly in a Surface. A search control owns
its internal icon/text spacing; its surrounding pane owns the distance from the pane edge.

Do not put a group of panels inside another panel solely to draw a frame. A group heading,
toolbar and its panels belong on the canvas. Repeated cards use the `card` material to avoid
one backdrop-blur pass per item. Code blocks and surfaces being demonstrated retain their
own actual containers.

```tsx
import { useState } from "react";
import { SearchField } from "glass-ux/input";
import { Surface } from "glass-ux/surface";

export function ComponentDirectory() {
  const [query, setQuery] = useState("");
  return (
    <Surface as="nav" aria-label="Components" material="chrome" padding="panel">
      <SearchField aria-label="Find a component" value={query} onValueChange={setQuery} />
    </Surface>
  );
}
```

## CSS names and verification

Tailwind's `p-panel` utility reads `--inset-panel`. It is not a CSS variable named `--p-panel`.
Use `--inset-tile`, `--inset-panel`, `--inset-dialog`, semantic gap roles and radius roles in
host CSS. Keep geometry responsive to density, UI scale, radius scale and line weight.

```sh
pnpm exec glass-ux check-layout src
```

The check finds CSS variable references with neither a definition nor an explicit fallback.
It reads the installed library styles and supplied host CSS/inline style declarations. Pass
all host style directories, including any separate token stylesheet. Dynamically constructed
host variables need a documented CSS default or fallback. This check detects misspelled
tokens; it does not prove visual composition.

Verify the first screen in light/dark/Solid, comfortable/compact density, non-default radius
and line weight, and a narrow viewport. Check actual pane insets, card corners, focus rings,
scroll edges and clipping. A page rendering without errors or passing axe is insufficient
evidence for those layout properties. The library's catalogue regression checks compare
computed geometry with the theme and require group sections to stay on the canvas.

Documentation section navigation stays outside the article, left aligned and inset from
the parent's corners. Desktop uses `--space-16` (64px at the default UI scale) between rail
and article; phones use chips. Size previews stack in ascending width-times-height order;
the free resize frame follows the preset examples.
