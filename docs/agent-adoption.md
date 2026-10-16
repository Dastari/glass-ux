# AI agent adoption

The package carries the same versioned documentation used by humans. An agent should begin
with the installed `README.md` and `llms.txt`, then read the relevant API page and declaration
file before writing a component call. The live site is useful for examples and visual review;
the installed package is authoritative for the version being integrated.

Before composing a screen, apply the [screen content rules](ui-rules.md#screen-content-rules).
Every bundled skill carries these defaults: restrained headings, informational copy, no
feature-explaining filler, primary content near the top, no duplicate route titles, and no
content shifts that move interaction targets. Explicit user or project instructions may
specify a different presentation; a generic request for a website does not imply slogans
or promotional copy. Deliberate long-form documents may contain necessary structure and prose.

## Install project skills

```sh
pnpm exec glass-ux skills list
pnpm exec glass-ux skills install --target agents
```

Use `--target claude` for `.claude/skills`, or `--target agents` for `.agents/skills`.
The installer copies only the six Glass UX skill folders and retains existing project
instructions. It refuses to replace an existing skill unless `--update` is supplied.

| Skill                 | Task                                                            |
| --------------------- | --------------------------------------------------------------- |
| `glass-ux-adopt`      | Install, style, configure providers and verify the first screen |
| `glass-ux-components` | Select and compose controls, identity, surfaces and overlays    |
| `glass-ux-forms`      | Bind typed fields, units, schema validation and submission      |
| `glass-ux-data`       | Tables, server filters, charts, maps and topology               |
| `glass-ux-assistant`  | Typed conversations, results, asks, approvals and host handlers |
| `glass-ux-author`     | Add a reusable component, documentation and relevant checks     |

The package's `AGENTS.md` explains library ownership and verification. A consuming project's
own instructions remain authoritative for that project. Skills guide implementation; they
do not grant permission to publish, deploy or execute application operations.

## Information an integration agent needs

Give the agent the installed release version, the application's framework and styling
pipeline, the screen being changed and its data contract. It can then use the API index to
choose an existing component, inspect every prop and valid option, and adapt a complete
example. Ask it to preserve your router, authentication, domain models and visual identity.

When the library lacks an application-specific component, compose the generic primitives in
your project. A device, customer, ticket or tenant adapter belongs to the application; the
library accepts their typed view models and host callbacks.
