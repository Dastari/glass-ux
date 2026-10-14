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
