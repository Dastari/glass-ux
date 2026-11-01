import { checkSize } from "./docs-kit/lib/check-size.mjs";
import { loadDocsKit } from "./docs-kit/lib/config.mjs";

await checkSize(await loadDocsKit(), process.argv.slice(2));
