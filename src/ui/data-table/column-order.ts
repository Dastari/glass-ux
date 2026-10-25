/** Normalise a persisted/controlled order against current definitions, appending new columns. */
export function normaliseColumnOrder(
  ids: readonly string[],
  order: readonly string[] = [],
): string[] {
  const known = new Set(ids);
  return [...new Set([...order.filter((id) => known.has(id)), ...ids])];
}

/** Move within the column's pinned group, preserving every other column's position. */
export function moveColumn(
  order: readonly string[],
  id: string,
  to: number,
  pinned: ReadonlySet<string>,
): string[] {
  const group = order.filter((other) => pinned.has(other) === pinned.has(id));
  const from = group.indexOf(id);
  if (from < 0) return [...order];
  group.splice(from, 1);
  group.splice(Math.max(0, Math.min(to, group.length)), 0, id);
  let index = 0;
  return order.map((other) =>
    pinned.has(other) === pinned.has(id) ? group[index++]! : other,
  );
}
