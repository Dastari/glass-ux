import { loadDocsKit } from "./docs-kit/lib/config.mjs";
import { buildSite } from "./docs-kit/lib/site.mjs";

buildSite(await loadDocsKit());
