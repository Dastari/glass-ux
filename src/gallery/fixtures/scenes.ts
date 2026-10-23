// tokens:allow-file sample artwork: fictional landscapes drawn as SVG, coloured like photographs
/**
 * Sample pictures for Image specimens: repository-authored SVG landscapes, so the gallery
 * ships no photographs and loads nothing from the network. Each is a data URI at 4:3.
 */

interface Scene {
  sky: [string, string]
  sun: string
  far: string
  near: string
  ground: string
}

const SCENES: Record<"harbour" | "dunes" | "ridge" | "dusk", Scene> = {
  harbour: { sky: ["#9cc7e6", "#e8f1f6"], sun: "#fff6d8", far: "#6f93ad", near: "#3f6680", ground: "#2c4c63" },
  dunes: { sky: ["#f2c58f", "#fbe9cf"], sun: "#fff3dc", far: "#e0a46a", near: "#c9814a", ground: "#a8643a" },
  ridge: { sky: ["#b9d7c4", "#eef5ef"], sun: "#fbfbea", far: "#7fa58f", near: "#4e7a62", ground: "#33584a" },
  dusk: { sky: ["#3a3f72", "#c7849a"], sun: "#ffd7b5", far: "#5a4d7a", near: "#3a3360", ground: "#231f42" },
}

function svg({ sky, sun, far, near, ground }: Scene) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect width="1600" height="1200" fill="url(#s)"/>
<circle cx="1120" cy="380" r="120" fill="${sun}"/>
<path d="M0 760 L320 520 L620 700 L940 470 L1300 690 L1600 560 V1200 H0 Z" fill="${far}"/>
<path d="M0 900 L420 680 L760 860 L1120 700 L1600 900 V1200 H0 Z" fill="${near}"/>
<path d="M0 1040 C400 960 900 1120 1600 1000 V1200 H0 Z" fill="${ground}"/>
</svg>`
}

/** Fictional landscapes by name, as data URIs. */
export const SCENE_IMAGES = Object.fromEntries(
  Object.entries(SCENES).map(([name, scene]) => [name, `data:image/svg+xml,${encodeURIComponent(svg(scene))}`])
) as Record<keyof typeof SCENES, string>

/** Each scene's dominant colour, as a server would send it with the picture. */
export const SCENE_COLOURS = Object.fromEntries(
  Object.entries(SCENES).map(([name, scene]) => [name, scene.near])
) as Record<keyof typeof SCENES, string>

/** A source that never decodes, for the failed-load specimen. */
export const BROKEN_IMAGE = "data:image/png;base64,AAAA"
