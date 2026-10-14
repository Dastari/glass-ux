import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";

const sourceText = readFileSync(
  "src/gallery/assets/glass-ux-brand.json",
  "utf8",
);
const source = JSON.parse(sourceText);
const hash = (data) => createHash("sha256").update(data).digest("hex");
const gradient = (value, id) =>
  `<linearGradient id="${id}" x1="${value.from?.[0] ?? 0}" y1="${value.from?.[1] ?? 0}" x2="${value.to?.[0] ?? 1}" y2="${value.to?.[1] ?? 1}">${value.stops.map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}"/>`).join("")}</linearGradient>`;
const paths = (values) =>
  values
    .map(
      (path) =>
        `<path d="${path.d}"${path.transform ? ` transform="${path.transform}"` : ""}${path.opacity !== undefined ? ` opacity="${path.opacity}"` : ""}/>`,
    )
    .join("");
const artwork = `<defs>${gradient(source.primaryGradient, "glass-primary")}${gradient(source.secondaryGradient, "glass-highlight")}</defs><g id="glass-ux-logo-primary" fill="url(#glass-primary)">${paths(source.primary)}</g><g id="glass-ux-logo-secondary" fill="url(#glass-highlight)">${paths(source.secondary)}</g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${source.viewBox}" role="img" aria-label="Glass UX"><title>Glass UX</title>${artwork}</svg>\n`;
const svgPaths = [
  "public/brand/glass-ux.svg",
  "src/gallery/assets/glass-ux.svg",
];
const manifestPath = "public/brand/assets.json";
if (process.argv.includes("--check")) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.sourceSha256 !== hash(sourceText))
    throw new Error("Brand assets are stale; run pnpm brand.");
  for (const path of svgPaths)
    if (readFileSync(path, "utf8") !== svg)
      throw new Error(`${path} differs from the brand source.`);
  for (const asset of manifest.assets) {
    if (
      !existsSync(asset.path) ||
      hash(readFileSync(asset.path)) !== asset.sha256
    )
      throw new Error(`${asset.path} differs from its brand manifest.`);
  }
  console.log("brand: SVG, favicon and social preview match the supplied mark");
} else {
  mkdirSync("public/brand", { recursive: true });
  for (const path of svgPaths) writeFileSync(path, svg);
  const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640"><defs><linearGradient id="background" x2="1" y2="1"><stop stop-color="#0b1424"/><stop offset="1" stop-color="#201b39"/></linearGradient></defs><rect width="1280" height="640" fill="url(#background)"/><svg x="92" y="104" width="440" height="440" viewBox="${source.viewBox}">${artwork}</svg><g fill="#eff5ff" font-family="DejaVu Sans, sans-serif"><text x="610" y="278" font-size="72" font-weight="700">Glass UX</text><text x="614" y="340" font-size="28">Components for clear interfaces.</text><text x="614" y="390" font-size="23" fill="#aebdd3">Typed APIs · Live examples · Agent skills</text><text x="614" y="500" font-size="22" fill="#73dfea">dastari.github.io/glass-ux</text></g></svg>`;
  writeFileSync("public/brand/social-preview.svg", social + "\n");
  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile("public/brand/glass-ux.png");
  await sharp(Buffer.from(social))
    .png()
    .toFile("public/brand/social-preview.png");
  const assets = [
    ...svgPaths,
    "public/brand/glass-ux.png",
    "public/brand/social-preview.png",
    "public/brand/social-preview.svg",
  ].map((path) => ({ path, sha256: hash(readFileSync(path)) }));
  writeFileSync(
    manifestPath,
    JSON.stringify({ sourceSha256: hash(sourceText), assets }, null, 2) + "\n",
  );
  console.log(
    "brand: generated the inline mark, SVG, favicon PNG and 1280×640 social preview",
  );
}
