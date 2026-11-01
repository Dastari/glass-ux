import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";

/** Copies the built page to every route, so a static host serves deep links, and adds TypeDoc. */
export function buildSite(kit) {
  const gallery = kit.galleryDir;
  const components = JSON.parse(
    readFileSync(`${gallery}/catalogue.generated.json`, "utf8"),
  );
  const html = readFileSync(`${kit.siteDir}/index.html`, "utf8");
  for (const component of components) {
    const dir = `${kit.siteDir}/components/${component.id}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/index.html`, html);
  }
  const foundationIds = readdirSync(`${gallery}/sections`)
    .filter((file) => file.endsWith(".meta.ts"))
    .flatMap((file) => {
      const source = readFileSync(`${gallery}/sections/${file}`, "utf8");
      return /group:\s*"Foundations"/.test(source)
        ? [/id:\s*"([^"]+)"/.exec(source)[1]]
        : [];
    });
  for (const route of [
    ...kit.guides.map((guide) => `guides/${guide.id}`),
    ...foundationIds.map((id) => `foundations/${id}`),
  ]) {
    const dir = `${kit.siteDir}/${route}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/index.html`, html);
  }
  writeFileSync(`${kit.siteDir}/404.html`, html);
  if (existsSync(kit.typedocDir))
    cpSync(kit.typedocDir, `${kit.siteDir}/api`, { recursive: true });
  console.log(
    `Static pages prepared for ${components.length} component URLs and the TypeDoc reference.`,
  );
}
