---
name: glass-ux-assistant
description: Compose Glass UX assistant conversations, tools, results, context links, asks and approvals with typed application-owned handlers and entity resolvers.
---

# Compose an assistant experience

Before composing UI, read and apply the installed package's `docs/ui-rules.md`, especially
Screen content rules. These defaults apply to consuming websites and applications unless
explicit user or project instructions say otherwise: do not overuse subheadings, add
motivational/irrelevant/cheerful/promotional copy, overexplain the page, push primary content
down with redundant framing, repeat a route title already named by navigation, or introduce
content shifts that move buttons or menus. Use factual labels and reserve asynchronous
content space. Deliberate long-form documents may contain necessary headings and prose.

Read the installed `glass-ux/ai` declarations and the API pages for the composer,
conversation, results and request components in use. Start from the packaged live examples.

Adapt backend events into the library's typed view models. Register entity kinds and supply
`EntityResolverProvider` for identity, previews, actions, search and navigation. Supply
`ConversationHandlersProvider` for answering, approval, retry, feedback and editing.

Keep business types, tool execution, authorization, tenancy and approval policy in the host.
Displaying an approval card does not authorize an operation. Do not let model-generated text
choose arbitrary component names, navigation handlers or executable actions.

Render waiting questions and approvals in the conversation and composer dock rather than
opening an unsolicited modal. Preserve loading, streaming, failure, retry, cancellation and
resolved states. Results follow their declared disclosure metadata; previews are not permission
to expose hidden content. Use the entity renderer seam when the host has its own identity kit.
