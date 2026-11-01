/** A panel's menu as one action definition (R1.2), so its menus and the palette are the same list. */
import { useMemo } from "react"
import { defineActions, type ActionSet } from "../../lib/actions/actions.js"
import { useMessages } from "../../lib/i18n/index.js"
import { usePaneTree, type PaneTree } from "./context.js"
import { paneLayoutMessages } from "./messages.js"
import { stackOf, stacksOf, type PaneStack, type PaneTarget } from "./tree.js"

type Messages = typeof paneLayoutMessages.defaults

/** The title that names a stack: its active panel's, or its first known one's. */
export function stackTitle(tree: Pick<PaneTree, "definition">, stack: PaneStack) {
  const panels = stack.panels.filter((id) => tree.definition(id))
  const id = stack.active !== null && panels.includes(stack.active) ? stack.active : panels[0]
  return id === undefined ? "" : (tree.definition(id)?.title ?? "")
}

function buildActions(tree: PaneTree, messages: Messages): ActionSet<string> {
  const stacks = stacksOf(tree.layout.root).filter((stack) => stackTitle(tree, stack))
  const held = ([id]: readonly string[]) => (id === undefined ? undefined : stackOf(tree.layout.root, id))
  const movable = (id: string | undefined) => id !== undefined && tree.definition(id)?.movable !== false
  // Physical labels on reading-order edges, so the row says where the panel lands.
  const split = (id: string, label: string, edge: (rtl: boolean) => "start" | "end" | "top" | "bottom") => ({
    id,
    label,
    group: "organise" as const,
    visible: (targets: readonly string[]) => (held(targets)?.panels.length ?? 0) > 1,
    run: ([panel]: readonly string[]) => {
      const stack = held([panel!])
      if (stack) tree.moveFocused(panel!, { stack: stack.id, edge: edge(tree.rtl()) } as PaneTarget)
    },
  })
  return defineActions<string>("pane", [
    {
      id: "move",
      label: messages.moveTo,
      group: "organise",
      visible: ([id]) => !tree.locked && !tree.narrow && movable(id) && (stacks.length > 1 || (held([id!])?.panels.length ?? 0) > 1),
      children: [
        ...stacks.map((stack) => ({
          id: `to:${stack.id}`,
          label: stackTitle(tree, stack),
          group: "organise" as const,
          visible: ([id]: readonly string[]) => held([id!])?.id !== stack.id,
          run: ([id]: readonly string[]) => tree.moveFocused(id!, { stack: stack.id }),
        })),
        split("split-left", messages.splitLeft, (rtl) => (rtl ? "end" : "start")),
        split("split-right", messages.splitRight, (rtl) => (rtl ? "start" : "end")),
        split("split-up", messages.splitUp, () => "top"),
        split("split-down", messages.splitDown, () => "bottom"),
      ],
    },
    {
      id: "maximise",
      label: ([id]) => (tree.layout.maximised && tree.layout.maximised === held([id!])?.id ? messages.restore : messages.maximise),
      group: "manage",
      visible: () => !tree.narrow && stacks.length > 1,
      run: ([id]) => {
        const stack = held([id!])
        if (stack) tree.maximise(tree.layout.maximised === stack.id ? null : stack.id)
      },
    },
    {
      id: "close",
      label: messages.close,
      group: "danger",
      // A tab's own menu already has Close, from the strip.
      surfaces: ["menu", "palette"],
      visible: ([id]) => !tree.locked && id !== undefined && tree.definition(id)?.closable !== false,
      run: ([id]) => void tree.close(id!),
    },
  ])
}

/**
 * Inside a panel, the actions its menus offer: Move to, Maximise and Close. Targets are panel
 * ids. Render them with `ActionMenu`, or pass them to `usePaletteActions` so the palette and
 * shortcuts reach them. No keys are bound by default.
 */
export function usePanelActions(): ActionSet<string> {
  const tree = usePaneTree()
  const messages = useMessages(paneLayoutMessages)
  return useMemo(() => buildActions(tree, messages), [tree, messages])
}
