/** The fields a catalogue entry needs to be grouped into documents. */
export interface FamilyEntry {
  id: string;
  name: string;
  family: string;
}

/** Which exports share a document, from a project's `families` and `familyMembers`. */
export interface FamilyConfig {
  /** Family id to root component. */
  roots: Readonly<Record<string, string>>;
  /** Component id to the related exports on its page, in display order. */
  related: Readonly<Record<string, readonly string[]>>;
}

/** Groups a catalogue into documents, one per root component, with its related exports. */
export function createComponentFamilies<T extends FamilyEntry>(
  catalogue: readonly T[],
  { roots, related }: FamilyConfig,
) {
  const explicitParents = new Map(
    Object.entries(related).flatMap(([parent, children]) =>
      children.map((child) => [child, parent] as const),
    ),
  );
  const immediateParentId = (component: T) =>
    explicitParents.get(component.id) ?? roots[component.family] ?? component.id;
  const byId = new Map(catalogue.map((component) => [component.id, component]));

  function parentId(component: T): string {
    const visited = new Set<string>();
    let current = component;
    while (true) {
      if (visited.has(current.id))
        throw new Error(
          `Circular documentation family: ${[...visited, current.id].join(" → ")}`,
        );
      visited.add(current.id);
      const parent = immediateParentId(current);
      if (parent === current.id) return parent;
      const next = byId.get(parent);
      if (!next)
        throw new Error(
          `Unknown documentation family ${parent} for ${current.id}`,
        );
      current = next;
    }
  }

  function familyMembers(component: T): T[] {
    const preferred = related[component.id] ?? [];
    const children = catalogue.filter(
      (item) =>
        item.id !== component.id && immediateParentId(item) === component.id,
    );
    children.sort((a, b) => {
      const rank = (id: string) => {
        const index = preferred.indexOf(id);
        return index < 0 ? preferred.length : index;
      };
      return rank(a.id) - rank(b.id) || a.name.localeCompare(b.name);
    });
    return [component, ...children.flatMap(familyMembers)];
  }

  const all = catalogue
    .filter((component) => parentId(component) === component.id)
    .map((component) => ({ ...component, components: familyMembers(component) }));
  const find = (id: string) =>
    all.find((family) =>
      family.components.some((component) => component.id === id),
    );
  const destination = (id: string): { id: string; hash?: string } => {
    const family = find(id);
    return family && family.id !== id ? { id: family.id, hash: id } : { id };
  };
  return { all, find, destination };
}
