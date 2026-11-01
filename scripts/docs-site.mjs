import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
const components = JSON.parse(
  readFileSync("src/gallery/catalogue.generated.json", "utf8"),
);
const html = readFileSync("apps/docs/dist/index.html", "utf8");
for (const component of components) {
  const dir = `apps/docs/dist/components/${component.id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
}
const foundationIds = readdirSync("src/gallery/sections")
  .filter((file) => file.endsWith(".meta.ts"))
  .flatMap((file) => {
    const source = readFileSync(`src/gallery/sections/${file}`, "utf8");
    return /group:\s*"Foundations"/.test(source)
      ? [/id:\s*"([^"]+)"/.exec(source)[1]]
      : [];
  });
const templateIds = readdirSync("src/gallery/templates")
  .filter((file) => file.endsWith(".tsx") && file !== "application-shell.tsx")
  .map((file) => file.replace(".tsx", ""));
for (const route of [
  "guides/getting-started",
  "guides/integration",
  "guides/agent-adoption",
  "guides/layout-contract",
  "guides/ui-rules",
  "guides/testing",
  "guides/migration",
  ...foundationIds.map((id) => `foundations/${id}`),
  ...templateIds.flatMap((id) => [`templates/${id}`, `templates/${id}/preview`]),
]) {
  const dir = `apps/docs/dist/${route}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
}
writeFileSync("apps/docs/dist/404.html", html);
cpSync(".handoff/typedoc", "apps/docs/dist/api", { recursive: true });
console.log(
  `Static pages prepared for ${components.length} component URLs and the TypeDoc reference.`,
);
