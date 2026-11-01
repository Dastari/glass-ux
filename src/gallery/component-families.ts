import catalogue from "./catalogue.generated.json" with { type: "json" };
import config from "./families.generated.json" with { type: "json" };
import { createComponentFamilies } from "./families.js";

/** One exported component and its generated purpose, entry point and specimen. */
export type ComponentCatalogueEntry = (typeof catalogue)[number];

/** A base component and the related exports documented in its single article. */
export interface ComponentFamily extends ComponentCatalogueEntry {
  /** The base export first, followed by its controls, slots, variants and skeletons. */
  components: ComponentCatalogueEntry[];
}

/** The generated component catalogue: each public component's family, entry point, description and prop table, as rendered by the documentation pages. */
export const componentCatalogue = catalogue;

const families = createComponentFamilies(catalogue, config);

/** The concise documentation directory, with every original export retained in its family. */
export const componentFamilies: ComponentFamily[] = families.all;

/** Find the document containing a base component or any of its related exports. */
export function findComponentFamily(id: string): ComponentFamily | undefined {
  return families.find(id);
}

/** The canonical family route and optional section anchor for an original component identifier. */
export function componentDestination(id: string): {
  id: string;
  hash?: string;
} {
  return families.destination(id);
}
