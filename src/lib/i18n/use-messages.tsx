import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { useLocale } from "../locale/use-locale.js"
import type { MessageDescriptor, MessageOverrides, MessageSet } from "./catalog.js"
import { messagesVersion, resolveMessages, subscribeMessages } from "./i18n.js"

const MessagesContext = createContext<MessageOverrides>({})

/** Props for MessagesProvider. */
export interface MessagesProviderProps {
  /** Wording for the components inside, over the language pack and `configureMessages`. Nested providers merge per namespace. */
  messages: MessageOverrides
  /** The components that use this wording. */
  children?: ReactNode
}

/**
 * Overrides wording for one region of the application: an embedded customer view that
 * says "Site" where the rest says "Location". Nested providers merge, inner keys winning.
 */
export function MessagesProvider({ messages, children }: MessagesProviderProps) {
  const outer = useContext(MessagesContext)
  const value = useMemo(() => {
    const merged: Record<string, object> = { ...(outer as Record<string, object>) }
    for (const [namespace, set] of Object.entries(messages as Record<string, object>)) merged[namespace] = { ...merged[namespace], ...set }
    return merged as MessageOverrides
  }, [outer, messages])
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

/**
 * A namespace's messages for this component: English defaults, the language pack for its
 * locale, `configureMessages`, the nearest `MessagesProvider`, then `labels` (the
 * component's own prop, when it has one). Pass the component's `locale` prop as `locale`.
 */
export function useMessages<Namespace extends string, Defaults extends MessageSet>(
  descriptor: MessageDescriptor<Namespace, Defaults>,
  options: { labels?: Partial<Defaults>; locale?: string } = {},
): Defaults {
  const locale = useLocale(options.locale)
  const provided = (useContext(MessagesContext) as Record<string, Partial<Defaults> | undefined>)[descriptor.namespace]
  const version = useSyncExternalStore(subscribeMessages, messagesVersion, messagesVersion)
  const { labels } = options
  // biome-ignore lint/correctness/useExhaustiveDependencies: version invalidates registered packs and overrides
  return useMemo(
    () => resolveMessages(descriptor.namespace, descriptor.defaults, locale, provided, labels),
    [descriptor, locale, provided, labels, version],
  )
}
