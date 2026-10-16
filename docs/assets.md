# Bundled assets

The Glass UX mark was supplied by the project owner. Its vector paths and gradients are
stored in `src/gallery/assets/glass-ux-brand.json`; `pnpm brand` generates the SVG, favicon
PNG and 1280 × 640 social preview under `public/brand/`. The demo's `BrandSource` uses
the same data for inline gradients. Brand mode keeps the supplied colours, palette mode
uses semantic tones, and mono mode uses `currentColor`.

The generated profile portraits in `src/gallery/assets/portraits/` are synthetic demo
faces originally obtained from https://thispersondoesnotexist.com/. The repository owner
expressly confirmed redistribution rights on 2026-10-14. Only reviewed, usable portraits
are included. Fictional identities are assigned by the gallery and do not identify real people.

Fonts are redistributed from the Fontsource packages listed in package.json. Their original
licence texts are retained under `src/assets/fonts/licences/` and in the release package.

The ambient canvas is repository-authored SVG. The geographic outlines copied into the docs
site come from Natural Earth and retain the attribution provided by each map configuration.

Social and company icons are original geometric adaptations authored in
`scripts/icon-authoring/defs/brands.mjs`, using the same monochrome icon frame as the UI
set. No external logo SVGs or icon packages are bundled. Identity references include the
[Google Brand Resource Center](https://about.google/brand-resource-center/),
[Microsoft brand assets](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks),
[Meta brand resources](https://about.meta.com/brand/resources/),
[X Brand Toolkit](https://about.x.com/en/who-we-are/brand-toolkit), and
[GitHub Brand Toolkit](https://brand.github.com/foundations/logo).

Device manufacturer identifiers use original geometric symbols and monograms in
`scripts/icon-authoring/defs/device-computers-network.mjs` and
`scripts/icon-authoring/defs/device-printers-voip.mjs`. References include manufacturers'
own sites, such as [Dell](https://www.dell.com/), [HP](https://www.hp.com/),
[Cisco](https://www.cisco.com/), [Ubiquiti](https://ui.com/),
[Yealink](https://www.yealink.com/) and [Kyocera](https://global.kyocera.com/).
