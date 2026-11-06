// The public surface of glass-ux-docs-kit/react. scripts/pack-docs-kit.mjs packs this module and
// what it imports, so anything reachable from here must be free of Glass UX's own catalogue.
export {
  ApiReference,
  type ApiReferenceProps,
  ComponentDocumentation,
  FoundationDocumentation,
  type FoundationDocumentationProps,
  UsageExample,
} from "./documentation.js";
export { LibraryGuide } from "./guide.js";
export {
  TemplateDocumentation,
  TemplatePreview,
  type TemplateDocumentationProps,
  type TemplatePreviewProps,
  type TemplateSource,
} from "./template-page.js";
export {
  CatalogueIndex,
  type CatalogueEntry,
  type CatalogueLinkProps,
} from "./catalogue-index.js";
export {
  CONTAINER_PRESETS,
  ContainerLab,
  Example,
  Matrix,
  OnCanvas,
  Rules,
  SectionPage,
  Specimen,
  SwapSlot,
  TierBox,
  TierRow,
  TokenTable,
  tierBoxClass,
  type ContainerPreset,
  type SpecimenProps,
  type TierBoxSize,
} from "./kit.js";
export {
  DocsKitProvider,
  GROUPS,
  siteRuntime,
  useDocsSite,
  type DocsSite,
  type SiteCollection,
  type SiteComponent,
  type SiteContent,
  type SiteSection,
} from "./site.js";
export type { SectionGroup, SectionMeta } from "./types.js";
