import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { entrySpecifiers, publicImports } from "./docs-kit/lib/entries.mjs";

const FOLDER = "src/gallery/templates";

/** The screens in src/gallery/templates, by file name; application-shell frames their previews. */
export async function templateIds() {
  return readdirSync(FOLDER)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(".tsx", ""));
}

/**
 * A template's public source: the screen with its imports as package entries, ready to copy.
 * A template composes public entries only, so anything else throws, gallery modules included.
 */
export async function templateExample(id, entries = entrySpecifiers()) {
  const refuse = (source) => {
    throw new Error(`the screen imports src/${source}, which no package entry exports`);
  };
  const source = readFileSync(`${FOLDER}/${id}.tsx`, "utf8");
  const code = publicImports(source, FOLDER, entries, refuse);
  const gallery = /from\s+["'](glass-ux\/gallery[^"']*)["']/.exec(code);
  if (gallery) refuse(gallery[1].replace("glass-ux/", ""));
  return format(code, { parser: "typescript", printWidth: 100 });
}

/** Write `examples/template-<id>.tsx.txt` for every screen; the documentation shows these. */
export async function generateTemplateExamples() {
  const entries = entrySpecifiers();
  for (const id of await templateIds())
    writeFileSync(`src/gallery/examples/template-${id}.tsx.txt`, await templateExample(id, entries));
}
