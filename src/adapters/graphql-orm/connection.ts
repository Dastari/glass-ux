/**
 * graphql-orm connections → DataTable rows, for paged and infinite tables. The generated list
 * resolvers return `{ Edges { Node Cursor } PageInfo { HasNextPage EndCursor TotalCount } }`:
 *
 *   const devices = connectionRows(data?.Devices)
 *   <DataTable rows={devices.rows} rowCount={devices.rowCount} infinite={{
 *     hasMore: devices.hasMore,
 *     loadingMore: networkStatus === NetworkStatus.fetchMore,
 *     onLoadMore: () => fetchMore({ variables: { Page: nextOffsetPage(data.Devices, 50) } }),
 *   }} … />
 *
 * With Apollo Client, `connectionPagination()` is the list field's type policy: it appends
 * each batch `fetchMore` brings to the cached list, which stays keyed by the other arguments,
 * so a new `Where` or `OrderBy` is a new list.
 *
 * An offset list (`Page: { Limit, Offset }`) takes the table's sorting. A keyset list
 * (`<Plural>Keyset(page: { after, limit })`) has a fixed order: use it for a table without
 * sortable columns, such as a newest-first log.
 */

/** One edge: the row and its position. */
export interface ConnectionEdge<N> {
  Node: N
  Cursor?: string | null
}

/** The connection's page facts. `TotalCount` is null on a keyset list unless `includeTotalCount` asked for it. */
export interface ConnectionPageInfo {
  HasNextPage: boolean
  HasPreviousPage?: boolean | null
  StartCursor?: string | null
  EndCursor?: string | null
  TotalCount?: number | null
}

/** A graphql-orm connection: `<Entity>Connection`. */
export interface Connection<N> {
  Edges: readonly ConnectionEdge<N>[]
  PageInfo: ConnectionPageInfo
}

/** A connection as DataTable reads it. */
export interface ConnectionRows<N> {
  /** The nodes, in order. The same array for the same connection object. */
  rows: readonly N[]
  /** `TotalCount`, when the server counted. */
  rowCount: number | undefined
  /** `HasNextPage`. */
  hasMore: boolean
  /** `EndCursor`: the keyset list's `after` for the next batch. */
  endCursor: string | undefined
}

const EMPTY: ConnectionRows<never> = { rows: [], rowCount: undefined, hasMore: false, endCursor: undefined }
const cache = new WeakMap<object, ConnectionRows<unknown>>()

/**
 * The rows and page facts of a connection (absent while the first page loads). The result is
 * cached per connection object, so a render that reads the same query result passes the table
 * the same `rows` and nothing re-renders or flashes.
 */
export function connectionRows<N>(connection: Connection<N> | null | undefined): ConnectionRows<N> {
  if (!connection) return EMPTY
  const cached = cache.get(connection)
  if (cached) return cached as ConnectionRows<N>
  const result: ConnectionRows<N> = {
    rows: connection.Edges.map((edge) => edge.Node),
    rowCount: connection.PageInfo.TotalCount ?? undefined,
    hasMore: connection.PageInfo.HasNextPage,
    endCursor: connection.PageInfo.EndCursor ?? undefined,
  }
  cache.set(connection, result)
  return result
}

/** The offset list's `Page` for the batch after the loaded rows: `{ Limit, Offset }`. */
export function nextOffsetPage(connection: Connection<unknown> | null | undefined, limit: number): { Limit: number; Offset: number } {
  return { Limit: limit, Offset: connection?.Edges.length ?? 0 }
}

/** The keyset list's `page` for the batch after the loaded rows: `{ after, limit, includeTotalCount }`. */
export function nextKeysetPage(
  connection: Connection<unknown> | null | undefined,
  limit: number,
  options: { includeTotalCount?: boolean } = {}
): { after?: string; limit: number; includeTotalCount: boolean } {
  const after = connection?.PageInfo.EndCursor ?? undefined
  return { ...(after ? { after } : {}), limit, includeTotalCount: options.includeTotalCount ?? false }
}

/** The arguments Apollo passes a field policy (structurally, so this module needs no Apollo import). */
type FieldArgs = Record<string, unknown> | null | undefined

export interface ConnectionPaginationOptions {
  /**
   * The page argument's name. Default: `Page`, else `page` (the keyset list's argument). It is
   * left out of the cache key; every other argument (`Where`, `OrderBy`, a scope) is in it.
   */
  pageArg?: string
}

/**
 * An Apollo Client field policy for a graphql-orm list field: a batch fetched with an `Offset`
 * (or an `after` cursor) joins the cached list at that position; the first page (a refetch,
 * a poll) replaces the head and keeps the rows loaded after it. A node already in the list
 * (normalised to the same reference) keeps its first place, so rows that shift between offset
 * batches are not shown twice.
 *
 *   new InMemoryCache({ typePolicies: { Query: { fields: { Devices: connectionPagination() } } } })
 */
export function connectionPagination(options: ConnectionPaginationOptions = {}) {
  const pageOf = (args: FieldArgs) => {
    const page = (options.pageArg ? args?.[options.pageArg] : (args?.Page ?? args?.page)) as Record<string, unknown> | null | undefined
    return page ?? {}
  }
  return {
    keyArgs(args: FieldArgs): string[] | undefined {
      if (!args) return undefined
      const skip = options.pageArg ? [options.pageArg] : ["Page", "page"]
      return Object.keys(args)
        .filter((name) => !skip.includes(name))
        .sort()
    },
    merge(existing: Connection<unknown> | undefined, incoming: Connection<unknown>, { args }: { args: FieldArgs }): Connection<unknown> {
      if (!existing) return incoming
      const page = pageOf(args)
      const after = (page.after ?? page.After) as string | null | undefined
      const offset = Number(page.Offset ?? page.offset ?? 0) || 0
      const loaded = existing.Edges
      const start = after ? loaded.length : Math.min(Math.max(offset, 0), loaded.length)
      const tail = after ? [] : loaded.slice(start + incoming.Edges.length)
      const edges = uniqueEdges([...loaded.slice(0, start), ...incoming.Edges, ...tail])
      // The last batch's facts hold while it is still the end of the list.
      const end = tail.length ? existing.PageInfo : incoming.PageInfo
      const head = start > 0 ? existing.PageInfo : incoming.PageInfo
      return {
        ...incoming,
        Edges: edges,
        PageInfo: {
          ...end,
          HasPreviousPage: head.HasPreviousPage ?? null,
          StartCursor: head.StartCursor ?? null,
          TotalCount: incoming.PageInfo.TotalCount ?? existing.PageInfo.TotalCount ?? null,
        },
      }
    },
  }
}

function uniqueEdges(edges: readonly ConnectionEdge<unknown>[]): ConnectionEdge<unknown>[] {
  const seen = new Set<string>()
  return edges.filter((edge) => {
    const ref = (edge.Node as { __ref?: unknown } | null)?.__ref
    if (typeof ref !== "string") return true
    if (seen.has(ref)) return false
    seen.add(ref)
    return true
  })
}
