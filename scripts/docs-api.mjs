import { generateApi } from "./docs-kit/lib/api.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

await generateApi(await loadDocsKit());
