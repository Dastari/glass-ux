# Integrate into an existing application

Keep the application's router, identity, authentication, GraphQL client and data services.
Adopt Glass UX through its public imports and replace one coherent screen at a time.
Read [the theme and layout contract](layout-contract.md) before composing the first screen.

| Existing pattern                                       | Glass UX primitive                                            |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Action button with asynchronous feedback               | `ActionButton`                                                |
| Ad hoc modal                                           | `Dialog` or `AlertDialog`                                     |
| Form control plus separate error markup                | `Field`, a typed bound field and its schema helper            |
| Entity name, icon and action menu assembled repeatedly | `EntityIdentity` and a shared `ActionSet`                     |
| Interactive table                                      | `DataTable`, typed columns, filters and a host data adapter   |
| Built-in interface wording and translations             | `glass-ux/i18n`, `glass-ux/i18n/<tag>` and `LocaleProvider` (purpose keys such as `dataTable.noRows`)     |
| Local palette dropdown                                 | `SwatchPicker` and the appearance runtime                     |
| Browser tooltip on truncated text                      | `TruncatedText` or `Tooltip`                                  |
| Repeated clipboard handler                             | `CopyButton`                                                  |
| Assistant UI tied directly to backend rows             | Typed view models, entity resolvers and conversation handlers |

An application-owned palette is CSS containing the named `data-palette` selector and the
palette parameters. Register its identifier and label with `definePalette(id, label)`, then
use it in `configureAppearance`. A brand colour without a full palette can be a default
instead: `configureAppearance({ defaults: { accentColor: "#0b6e4f" } })`, adjusted for
contrast like any custom colour. `defineBackground(id, label)` registers an
application-owned canvas, and `backgroundImage` with `background: "image"` shows a
company picture behind the glass (see [the layout contract](layout-contract.md#css-names-and-verification)). Use a project storage key to retain existing preferences.
Configure product marks with `configureBrand`; the library ships no application logos.

## Keep a theme in the project

`AppearanceSettings` changes the appearance for one person. To make an appearance the project's
own, export it and commit the result. The documentation's Theme export page does this with
controls, copy and download; the same helpers run anywhere, server code included:

```ts
import { exportAppearance, importAppearance } from "glass-ux/appearance";

const { theme, source, css, attributes, omitted } = exportAppearance(appearance);
```

- `source` is a typed module, `theme.ts`. Importing it calls `configureAppearance`, so the theme
  becomes the application's defaults. Call it before the first render, on the server as well for
  SSR. Keys left out match the built-in appearance, and a person can still change any of them.
- `css` is `theme.css`, for a page without `AppearanceProvider`, such as a static site. It sets
  the radius, line weight, UI scale and colour parameters on `<html>`, which must carry
  `attributes` (written out in the file's comment). Import it after the library's styles. An
  application with the runtime uses `source` alone: the runtime removes an inline value that
  returns to the built-in one, which would uncover the CSS.
- `omitted` names what could not be kept: an invalid value, or a `blob:` picture that exists only
  in this browser.

`importAppearance` restores a theme from the value, its JSON or the text of `theme.ts`, and is
safe for input you did not write:

```ts
const result = importAppearance(text);
if (result.ok) update(result.appearance); // update from useAppearance
else showIssues(result.issues); // [{ field: "uiScale", reason: "invalid" }]
```

Unknown fields are ignored. A known field with a bad value refuses the whole theme, with one
issue per field, so a theme restores exactly or not at all. A picture on another site is refused
unless you pass `{ remotePictures: true }`, because loading it would tell that site who opened the
theme. Palette and background ids must be registered first (`definePalette`, `defineBackground`).
A theme carries `defaults`, blur (`defaults.glassRendering`) included; `locked` and `storageKey` stay
in your code. A theme from before 0.19.4 states blur at the top level, and imports the same way.

Components format with the page's `<html lang>`, or with `configureLocale()` from
`glass-ux/locale` when the application sets one; see
[Set the formatting locale](getting-started.md#set-the-formatting-locale). A page without
`lang` or a configured locale formats as `en-US`. Wrap a region in `LocaleProvider` when it
must format differently, such as a customer's invoice.

Single-character keyboard shortcuts (the rail's "g e" sequences, a palette command whose
shortcut is a bare `c` or `?`, a document-wide `useHotkeys("g")`) run from anywhere on the
page. To let people turn them off (WCAG 2.1.4), call `configureShortcuts({ characterKeys:
false })` from `glass-ux/kbd`, for instance from a preference in your settings page; the
default keeps them on. Their key hints leave the tooltips, menus and palette while off.
Shortcuts with Ctrl, Alt or Command, and keys that act only inside the widget that has
focus, are not affected.

`<AppShell focusRegions>` makes F6 and Shift+F6 move between the top bar, rail, section drawer,
workspace, inspector and phone navigation, so a keyboard user can leave a text editor or
terminal-like pane, where Tab belongs to the content. It is off by default. Mark panes of your
own with `data-focus-region`, or use `useFocusRegions` from `glass-ux/hooks` without the shell.
Browsers bind F6 to their own panes, usually the address bar. The hook cancels that only when it
moves focus: with fewer than two regions or a modal dialog open the key stays the browser's.
Ctrl+L, Alt+D and ⌘L still reach the address bar. An application that routes its own shortcuts,
so a host can veto or rebind them, binds F6 itself and calls `next()` and `previous()` from
`useFocusRegionNavigation`, which moves the same way and binds no key.

For rebinding, chords and a help dialog, mount `KeymapProvider` from `glass-ux/keymap` once and
register commands with `useShortcutCommands`, or `useActionShortcuts` for a `defineActions` set.
Pass `keymap` and `onKeymapChange` to keep the person's changes wherever preferences live: the
value is plain JSON, and `normaliseKeymap` cleans what comes back from storage. Showing a
shortcut registers nothing: `Kbd`, `Button shortcut`, tooltips and menu rows only draw it, and
`useCommandBinding` reads its current keys. Give a command `scope` when its keys work only while
an element has focus, or leave out `run` when something else handles them.

When replacing local components, remove their duplicate implementation after the packaged
version passes the application's checks. Keep application-specific components and compose
them from Glass UX. A release dependency and lockfile should identify the exact archive used.

Whole screens to start from are in the documentation's Templates group: an overview dashboard,
a settings page, a list with a detail pane, an inbox and a file manager. Each is one file that
imports public entries only, so copy it into your project, replace its sample data and put it in
your shell's workspace. They use Tailwind utilities, so your `@source` must cover the folder.

The component catalogue is not part of the package. Link to the
[documentation site](https://dastari.github.io/glass-ux/), or host the `glass-ux-docs.tar.gz`
asset from the same release, where an application needs it offline. Your product's own
examples remain application-owned.

## Document layout defaults

The shared styles set document typography, colours and viewport scrolling defaults for
workspace applications. If the host is a document or marketing site that scrolls the whole
page, keep the component styles and override the document defaults in the host stylesheet:

```css
@layer base {
  html {
    height: auto;
    overflow: auto;
  }
  body {
    height: auto;
    overflow: visible;
  }
}
```

Import this override after the library styles. The host continues to own page width, layout
and scrolling; library documentation uses a centered document and its own scrolling region.

## Scrolling regions

Give each scrolling region one owner. A fill `DataTable` (the default), a scrolling `Panel`
and a window body scroll inside themselves and need a parent with a definite height; flex and
grid ancestors on the way need `min-height: 0` or a `minmax(0, 1fr)` track. Put a table in
a pane that already scrolls with `height="auto"`, so the pane scrolls it. Leave `wheel` events
to the browser on ancestors of these regions: a non-passive listener that calls
`preventDefault()` stops every scroller inside it.
