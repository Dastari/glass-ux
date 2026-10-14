import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Surface } from "../ui/surface/index.js";

/** A documentation destination; the host owns its route and optional status indicator. */
export interface CatalogueEntry {
  /** Stable catalogue key, also available to the host route adapter. */
  id: string;
  /** Human-readable component or section name. */
  title: string;
  /** Short purpose shown beneath the name. */
  summary: string;
  /** Heading in groups under which this destination is listed. */
  group: string;
  /** Destination used by the default anchor renderer. */
  href: string;
  /** Optional status or metadata beside the title. */
  trailing?: ReactNode;
}

/** Forward anchor props to the host router's Link, using entry to choose the destination. */
export type CatalogueLinkProps = Omit<ComponentProps<"a">, "href"> & {
  entry: CatalogueEntry;
};

/** A canvas catalogue with theme-sized cards; group headings never introduce another glass layer. */
export function CatalogueIndex({
  entries,
  groups,
  LinkComponent = CatalogueLink,
}: {
  /** Destinations rendered in their supplied order within each group. */
  entries: CatalogueEntry[];
  /** Action groups in display order. */
  groups: readonly string[];
  /** Host router adapter; forward the supplied anchor props and use entry for the route. */
  LinkComponent?: ComponentType<CatalogueLinkProps>;
}) {
  return (
    <div className="gallery-catalogue">
      {groups.map((group) => {
        const items = entries.filter((entry) => entry.group === group);
        if (!items.length) return null;
        return (
          <section
            className="gallery-catalogue-group"
            key={group}
            aria-label={group}
          >
            <h2 className="type-headline">{group}</h2>
            <div className="gallery-catalogue-grid">
              {items.map((entry) => (
                <Surface
                  as={LinkComponent}
                  entry={entry}
                  key={entry.id}
                  material="card"
                  radius="tile"
                  padding="tile"
                  className="gallery-catalogue-card fa-pressable"
                >
                  <span className="gallery-catalogue-card-title type-subtitle">
                    {entry.title}
                    {entry.trailing}
                  </span>
                  <span className="type-caption text-fg-muted">
                    {entry.summary}
                  </span>
                </Surface>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CatalogueLink({ entry, ...props }: CatalogueLinkProps) {
  return <a {...props} href={entry.href} />;
}
