# Getting started

Glass UX supplies typed React components, themes and interaction behaviour. Your application
supplies routes, authentication, data adapters, business entities and product branding.

## Install a release

React 19, React DOM 19 and Node 22.12 or newer are required. Install the built archive from
a GitHub release and commit the package-manager lockfile:

```sh
pnpm add https://github.com/Dastari/glass-ux/releases/download/v0.6.5/glass-ux-0.6.5.tgz
```

The archive includes JavaScript, TypeScript declarations, styles, fonts, guides and skills.
Installation does not compile the library. Use public entries such as `glass-ux/button`
and `glass-ux/data-table`; the package keeps large component families out of an unrelated
component's JavaScript bundle.

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
using routed tabs, table URL state or the packaged gallery. ActionProvider uses TanStack
navigation when available; supply its navigate callback for another router. Without a
router adapter it uses browser document navigation. For SSR, apply
`appearanceBootScript()` before first paint and use your framework's supported script API.

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
