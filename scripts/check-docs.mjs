import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import ts from "typescript";
import { undocumentedExports } from "./export-docs.mjs";
import { resolvesInPackage } from "./package-entries.mjs";
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
  const usagePath = `src/gallery/examples/${component.id}.tsx.txt`;
  if (existsSync(usagePath)) {
    const usage = readFileSync(usagePath, "utf8");
    const parsed = ts.createSourceFile(
      usagePath,
      usage,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    if (parsed.parseDiagnostics.length)
      failures.push(`${component.name}: usage example has invalid syntax`);
    for (const [, specifier] of usage.matchAll(/\bfrom\s+["']([^"']+)["']/g))
      if (!resolvesInPackage(specifier))
        failures.push(
          `${component.name}: usage example imports ${specifier}, which is not a package entry`,
        );
    if (/from ["'][^"']+["'];?\n\s*\nimport /m.test(usage))
      failures.push(
        `${component.name}: unnecessary blank line between imports`,
      );
  }
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
// Every public runtime export carries its own TSDoc (generated icons share one comment).
failures.push(...undocumentedExports());
// Generated placeholder prose is not documentation: describe the payload and timing instead.
const PLACEHOLDERS = [
  /The callback type specifies its arguments/,
  /Event callback; the typed signature specifies its arguments/,
];
for (const file of walk("src").filter(
  (f) => /\.tsx?$/.test(f) && !f.includes("/generated/"),
)) {
  const text = readFileSync(file, "utf8");
  for (const pattern of PLACEHOLDERS)
    for (const match of text.matchAll(new RegExp(pattern, "g")))
      failures.push(
        `${file}:${text.slice(0, match.index).split("\n").length}: placeholder documentation`,
      );
}
// Rule citations (R5 or R5.8) in code and docs name a rule defined in docs/ui-rules.md.
const rules = readFileSync("docs/ui-rules.md", "utf8");
const definedRules = new Set([
  ...[...rules.matchAll(/^## (R\d+) ·/gm)].map((m) => m[1]),
  ...[...rules.matchAll(/\*\*(R\d+\.\d+)\*\*/g)].map((m) => m[1]),
]);
for (const file of ["src", "apps/docs/src", "docs", "skills", "e2e"]
  .flatMap((dir) => walk(dir))
  .filter(
    (f) =>
      /\.(?:tsx?|css|md)$/.test(f) &&
      !f.includes("/generated/") &&
      !f.startsWith("docs/api/") &&
      !f.startsWith("src/gallery/api"),
  )) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bR\d{1,2}(?:\.\d+)?\b/g))
    if (!definedRules.has(match[0]))
      failures.push(
        `${file}:${text.slice(0, match.index).split("\n").length}: ${match[0]} is not a rule in docs/ui-rules.md`,
      );
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `docs: ${components.length} documented components, typed props, slots and live demo pages; public runtime exports have TSDoc; Markdown links and rule citations resolve`,
);
