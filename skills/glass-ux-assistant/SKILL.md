---
name: glass-ux-assistant
description: Compose Glass UX assistant conversations, tools, results, context links, asks and approvals with typed application-owned handlers and entity resolvers.
---

# Compose an assistant experience

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
