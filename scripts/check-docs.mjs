import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
const components = JSON.parse(
  readFileSync("src/gallery/api.generated.json", "utf8"),
);
const coverage = JSON.parse(
  readFileSync("src/gallery/demo-coverage.generated.json", "utf8"),
);
const sections = new Set(
  readdirSync("src/gallery/sections")
    .filter((f) => f.endsWith(".meta.ts"))
    .map((f) => f.replace(".meta.ts", "")),
);
const failures = [];
for (const component of components) {
  if (!component.description)
    failures.push(`${component.name}: no purpose documented`);
  if (!sections.has(component.section))
    failures.push(`${component.name}: no live demo`);
  if (
    !coverage.find((d) => d.id === component.id && d.covered) ||
    !existsSync(`src/gallery/demos/${component.id}.tsx`) ||
    !existsSync(`src/gallery/examples/${component.id}.tsx.txt`)
  )
    failures.push(
      `${component.name}: no focused live demo and matching usage source`,
    );
  if (
    !existsSync(`docs/api/${component.id}.md`) ||
    !existsSync(`src/gallery/api/${component.id}.json`)
  )
    failures.push(`${component.name}: no API page`);
  for (const part of [
    ...(component.props ? [component] : []),
    ...component.slots,
  ])
    for (const prop of part.props)
      if (!prop.inherited && !prop.description)
        failures.push(`${component.name}.${prop.name}: no description`);
}
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
    f.isDirectory() ? walk(join(dir, f.name)) : [join(dir, f.name)],
  );
}
for (const file of [
  "README.md",
  "AGENTS.md",
  ...walk("docs").filter((f) => f.endsWith(".md")),
]) {
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
    const link = match[1].replace(/^<|>$/g, "").split("#")[0];
    if (!link || /^(?:https?:|mailto:|#)/.test(link)) continue;
    if (!existsSync(resolve(dirname(file), link)))
      failures.push(`${file}: missing link ${link}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `docs: ${components.length} documented components, typed props, slots and live demo pages; Markdown links resolve`,
);
