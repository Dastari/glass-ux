# Getting started

Glass UX supplies typed React components, themes and interaction behaviour. Your application
supplies routes, authentication, data adapters, business entities and product branding.

## Install a release

React 19, React DOM 19 and Node 22.12 or newer are required. Supported browsers are current
Chrome, Edge, Firefox and Safari, and Firefox ESR 140. Firefox before 146 has no CSS
`@scope`, so there a palette island inside a light island on a dark page takes dark colours.
Install the built archive from a GitHub release and commit the package-manager lockfile:

```sh
pnpm add https://github.com/Dastari/glass-ux/releases/download/v0.11.6/glass-ux-0.11.6.tgz
```

The archive includes JavaScript, TypeScript declarations, styles, fonts, guides and skills.
It does not include the gallery, demos or source maps; the documentation site has those.
If your repository vendors the dependency, commit only the `.tgz` and never an unpacked
copy. Installation does not compile the library. Use public entries such as `glass-ux/button`
and `glass-ux/data-table`; the package keeps large component families out of an unrelated
component's JavaScript bundle. Only the entries in the package's `exports` resolve: internal
module paths such as `glass-ux/ui/button/button` do not.

For a new project, install the peer runtimes and the schema library used in the form
example. An existing project can keep compatible installed versions:

```sh
pnpm add react@19 react-dom@19 zod@4
pnpm add -D vite@8 @vitejs/plugin-react tailwindcss@4 @tailwindcss/vite typescript @types/react@19 @types/react-dom@19
```

## Configure Vite

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { glassUx } from "glass-ux/vite";

export default defineConfig({ plugins: [react(), tailwindcss(), glassUx()] });
```

The Glass UX plugin keeps its asset imports and lazy demo registry available to Vite’s
transforms. It uses [Vite’s documented dependency exclusions](https://vite.dev/config/dep-optimization-options#optimizedeps-exclude).
The tested build integration is Vite 8 with Tailwind 4. Frameworks using a different asset
pipeline must support the library’s ESM and asset imports; check that before migrating.

## Next.js App Router

The built package marks modules that use hooks, contexts, event handlers or browser rendering
with `"use client"`. Re-export barrels stay neutral: `configureAppearance`,
`appearanceBootScript`, `configureLocale`, `getLocale`, schema and formatting helpers remain
callable in server components. Import components from their public entries.

App Router layouts can render the providers directly. Configure appearance and locale in
both the server layout and a client setup module when overriding defaults: server and client
bundles have separate module state. Put `appearanceBootScript()` in a blocking head script
and use `suppressHydrationWarning` on `html`, as the script applies appearance before hydration.
Use a client component for callbacks and definitions such as DataTable columns; pass
serialisable values across the server/client boundary.

```tsx
// app/layout.tsx — a server component
import { AppearanceProvider, appearanceBootScript } from "glass-ux/appearance";
import { TooltipProvider } from "glass-ux/tooltip";
import "glass-ux/styles.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en-AU" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: appearanceBootScript() }} /></head>
    <body><AppearanceProvider><TooltipProvider>{children}</TooltipProvider></AppearanceProvider></body>
  </html>;
}
```

The font preload table uses bundled `.woff2?url` imports. With Next's webpack build, add
this asset rule to `next.config.mjs` and run `next build --webpack`. Configure the normal
Tailwind 4 PostCSS integration for utility classes used by the application.

```js
export default {
  webpack(config) {
    config.module.rules.push({
      test: /\.woff2$/, resourceQuery: /url/, type: "asset/resource",
      generator: { filename: "static/media/[name].[contenthash][ext]" },
    });
    return config;
  },
};
```

Run `pnpm test:next` in this repository to build the release archive with `pnpm pack:release`,
install it into an isolated copy of `tests/next-app-router`, and run a real Next.js App Router
production build. The fixture renders Button, Panel, Tooltip, icons, appearance providers
and a client DataTable, and calls configuration, locale, schema and formatting functions
from server components. It is outside the shipped package and outside `pnpm check`.
The webpack integration is tested; Turbopack's asset pipeline is not covered by this fixture.

## Add styles

Glass UX requires a Tailwind 4 CSS pipeline. For a Vite project, install and register
`@tailwindcss/vite`; for another build system, use Tailwind’s supported integration.
Create one application stylesheet:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
@import "glass-ux/styles.css";
@source "../node_modules/glass-ux/dist";
@source "./";
```

The `@source` paths are relative to that stylesheet. Import it once from your application
entry. Components use shared semantic tokens; use `className` for outer layout and the
component's props for variants. Fonts are bundled assets with relative URLs.

## Set up the root

```tsx
import { AppearanceProvider, configureAppearance } from "glass-ux/appearance";
import { TooltipProvider } from "glass-ux/tooltip";
import { ActionProvider } from "glass-ux/actions";
import { PaletteProvider } from "glass-ux/command-palette";
import { Button } from "glass-ux/button";

configureAppearance({
  storageKey: "my-application.appearance.v1",
  defaults: { palette: "graphite", mode: "system" },
  // Optional: panels and chrome show a pre-blurred canvas instead of a live blur.
  glassRendering: "baked",
});

export function App() {
  return (
    <AppearanceProvider>
      <TooltipProvider>
        <ActionProvider>
          <PaletteProvider>
            <Button variant="primary" onClick={() => console.info("Saved")}>
              Save changes
            </Button>
          </PaletteProvider>
        </ActionProvider>
      </TooltipProvider>
    </AppearanceProvider>
  );
}
```

Use the providers needed by your components. The host router wraps the application when
using routed tabs or table URL state. ActionProvider uses TanStack
navigation when available; supply its navigate callback for another router. Without a
router adapter it uses browser document navigation. For SSR, apply
`appearanceBootScript()` before first paint and use your framework's supported script API.

## Set the formatting locale

Numbers, money, byte sizes, dates, times, country names and sorting follow one BCP 47 locale.
A component resolves it in this order:

1. its own `locale` prop (date and time inputs, number, money and byte-size fields,
   `DataTable`, charts, `Metric`, `Pagination`, `Slider`, `CountrySelect`, `TimeZoneSelect`);
2. the nearest `LocaleProvider`;
3. `configureLocale()`;
4. the page's `<html lang>`, when it is a valid tag;
5. `en-US`.

Setting `<html lang="en-AU">` is usually enough. To choose the locale in code, or to format one
region differently:

```tsx
import type { ReactNode } from "react";
import { configureLocale, LocaleProvider } from "glass-ux/locale";

configureLocale("en-AU");

export function Invoice({ children }: { children: ReactNode }) {
  return <LocaleProvider locale="de-DE">{children}</LocaleProvider>;
}
```

Outside React, `getLocale()` returns the application locale (steps 3–5), and the exported
formatting helpers take an optional `locale` argument. Schema helpers write their messages
in that locale when a value is checked. A `LocaleProvider` cannot reach a schema, so pass the
field's `locale` to it when they differ. A server has no `<html lang>` to read: call
`configureLocale` with the same tag on the server and the client. Otherwise the first render
uses `en-US` and the page's locale applies once hydration completes.

## Translate the interface

Register only the packs you need. Built-in wording follows the same locale as formatting:

```tsx
import de from "glass-ux/i18n/de";
import { registerMessagePack, configureMessages, MessagesProvider, defineMessagePack } from "glass-ux/i18n";
import { LocaleProvider } from "glass-ux/locale";

registerMessagePack(de);
configureMessages({ pagination: {
  pages: "Ergebnisse",
  rowRange: (range: string, total: string) => `${range} von ${total}`,
} });

function GermanRegion({ children }) {
  return (
    <LocaleProvider locale="de">
      <MessagesProvider messages={{ pagination: { noRows: "Keine Ergebnisse" } }}>
        {children}
      </MessagesProvider>
    </LocaleProvider>
  );
}

// Add your own language; missing messages fall back to English.
registerMessagePack(defineMessagePack("fi", {
  pagination: { previousPage: "Edellinen sivu", nextPage: "Seuraava sivu" },
}));
```

Packs ship for `de`, `fr`, `es`, `it`, `pt-BR`, `nl`, `ja`, `zh-Hans`, `ko`, `ar` and `he`.
An exact tag wins; a language pack also serves regional tags (`de` serves `de-AT`).
`zh-Hans` and `pt-BR` need their matching tag. English is the fallback.
Wording resolves from English, the registered pack, `configureMessages`, nested
`MessagesProvider` overrides, then a component's existing `labels` prop. Use configuration
for product wording and providers for one region. Explicit text props such as `placeholder`
keep their precedence. Application content is not translated. Pass `locale` to schema
helpers when a form's provider differs from the application locale. Set `lang` and `dir`
on the host region as appropriate; `LocaleProvider` does not change DOM direction.

**Message keys.** Keys name their purpose (`discardTitle`, `rowRange`), rather than copying
the English sentence. Function messages take named, typed parameters; messages with more
than two values take one object. Pass raw values into a whole message so translations
control word order and punctuation. Never join translated sentence fragments. The table
namespace is `dataTable`; for example, `configureMessages({ dataTable: { noRows: "No results" } })`.

## Build a typed form

```tsx
import { z } from "zod";
import { emailSchema } from "glass-ux/email-field";
import {
  Form,
  FormActions,
  FormStack,
  formBehaviour,
  useAppForm,
} from "glass-ux/form";

const schema = z.object({ email: emailSchema({ required: true }) });

export function ContactForm() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { email: "" },
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      console.info(value.email);
    },
  });
  return (
    <Form form={form}>
      <FormStack>
        <form.AppField name="email">
          {(field) => <field.EmailField label="Email" />}
        </form.AppField>
        <FormActions>
          <form.SubmitButton>Save contact</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  );
}
```

Typed inputs have a bare control, a bound field and a schema helper. Their value units and
empty/required behaviour are documented in [the input guides](components/README.md).

## Find a component

Use the [API index](api/README.md) or the live site's search. Each component has its own URL,
live examples, complete example source and an API table. The API lists every custom property,
its type, literal options, required state, default and callback contract. Compound components
also document each slot; inherited React and DOM properties are available separately.

The standalone TypeDoc reference covers exported types and helpers alongside components.
The release carries the Markdown API and declaration files for offline use.

## Give an agent the same documentation

```sh
pnpm exec glass-ux skills list
pnpm exec glass-ux skills install --target agents
pnpm exec glass-ux skills install --target claude
```

The first installation writes only Glass UX skills under `.agents/skills`; the second uses
`.claude/skills`. Existing instructions are retained. After upgrading, pass `--update` to
refresh previously installed Glass UX skills. Agents can also read the package's `AGENTS.md`,
`llms.txt` and version-matched guides directly from `node_modules/glass-ux`.

## Verify adoption

Run your application's typecheck and affected tests. Try the screen with keyboard input,
light and dark modes, Solid material and a narrow container. If controls render unstyled,
check the stylesheet import and Tailwind source paths first. If context-dependent components
fail, check their provider contract and whether the host router is present.

## Right-to-left

Set the document's language and direction before rendering, and share the direction with
Base UI through `glass-ux/locale`:

```tsx
import { DirectionProvider, localeDirection } from "glass-ux/locale";

const language = "ar";
const direction = localeDirection(language);
document.documentElement.lang = language;
document.documentElement.dir = direction;

root.render(<DirectionProvider direction={direction}><App /></DirectionProvider>);
```

For a nested region, set its `dir` attribute and nest another `DirectionProvider` with the
same direction. The provider also reaches portalled menus and sheets; it does not create a
DOM wrapper. `useDirection()` reads that context. Formatting and translated messages remain
controlled by the locale and message providers.

Inline spacing, navigation arrows, selection controls and horizontal keyboard navigation
follow direction. `Sheet.Root side="start"` opens at the reading start and `side="end"` at
its end; existing `left` and `right` sides keep their physical edge. Charts, maps, media and
free window coordinates retain their physical axes; horizontal window keyboard commands
follow reading direction. Checkmarks, clocks and media icons keep their shape. Custom icons
can opt in with `data-icon-dir="mirror"`.

The documentation app accepts `?dir=rtl&lang=ar` on any page for RTL preview; reload with
`?dir=ltr&lang=en-AU` to restore its default preview direction and language.
