/**
 * tokens:allow-file colour maths: draws the resolved canvas colours, as the browser computed them, into a bitmap.
 *
 * The baked-frost renderer: draws the page canvas (its background colour, gradient and image
 * layers, and the Silk line overlay) with the 2D canvas API, then blurs and saturates it once
 * per material, as a material's backdrop-filter would. `installBakedFrost` loads this module
 * only when the application selects baked rendering (docs/performance.md, "Baked frost").
 *
 * It renders what the library's canvases use: linear, radial and repeating gradients, image
 * layers, background size, position and repeat, all fixed to the viewport. Anything else
 * (a colour hint, a four-value position, a scrolling canvas) is reported as unsupported, and
 * the materials keep the live blur. Gradients interpolate as CSS does: in premultiplied Oklab
 * when any stop is a CSS Color 4 colour, otherwise in premultiplied sRGB.
 */

/** sRGB channels and alpha, 0–1. */
export type Rgba = [number, number, number, number];
type Lab = [number, number, number, number];

export class Unsupported extends Error {
  override name = "Unsupported";
}

/** The item at `index`; a missing one means the CSS has a shape this renderer does not handle. */
function item<T>(list: ArrayLike<T>, index: number): T {
  if (index < 0 || index >= list.length) throw new Unsupported(`missing value ${index}`);
  return list[index] as T;
}

// ── Colour ───────────────────────────────────────────────────────────────────

const toLinear = (c: number) => (Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (Math.abs(c) <= 0.0031308 ? 12.92 * c : Math.sign(c) * (1.055 * Math.abs(c) ** (1 / 2.4) - 0.055));

function labToLinear([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const P3_TO_SRGB = [
  [1.2249401, -0.2249404, 0],
  [-0.0420569, 1.0420571, 0],
  [-0.0196376, -0.0786361, 1.0982735],
];

/** A parsed colour: Oklab for CSS Color 4 colours, sRGB for legacy ones (`rgb()`, hex, names). */
export interface Color {
  legacy: boolean;
  lab: Lab;
}

function number(token: string | undefined, percent = 1): number {
  if (token === undefined) throw new Unsupported("missing colour component");
  if (token === "none") return 0;
  const value = parseFloat(token);
  if (!Number.isFinite(value)) throw new Unsupported(`colour component ${token}`);
  return token.endsWith("%") ? (value / 100) * percent : value;
}

function hue(token: string | undefined): number {
  if (token === undefined) throw new Unsupported("missing hue");
  const value = parseFloat(token);
  if (token.endsWith("rad")) return (value * 180) / Math.PI;
  if (token.endsWith("turn")) return value * 360;
  if (token.endsWith("grad")) return value * 0.9;
  return token === "none" ? 0 : value;
}

const fromSrgb = (rgb: [number, number, number], alpha: number, legacy: boolean): Color => ({
  legacy,
  lab: [...linearToLab(rgb.map(toLinear) as [number, number, number]), alpha],
});

let probe: CanvasRenderingContext2D | null = null;

/** Parse a computed CSS colour. Unusual syntaxes go through a 1×1 canvas. */
export function parseColor(text: string): Color {
  const value = text.trim().toLowerCase();
  if (value === "transparent") return { legacy: true, lab: [0, 0, 0, 0] };
  const fn = /^([a-z-]+)\((.*)\)$/.exec(value);
  if (fn) {
    const [, name = "", body = ""] = fn;
    const [channels = "", alphaPart] = body.split("/");
    const parts = channels.replace(/,/g, " ").trim().split(/\s+/);
    const alpha = alphaPart !== undefined ? number(alphaPart.trim()) : parts.length === 4 ? number(parts[3]) : 1;
    if (name === "rgb" || name === "rgba")
      return fromSrgb(parts.slice(0, 3).map((part) => number(part, 255) / 255) as [number, number, number], alpha, true);
    if (name === "oklab") return { legacy: false, lab: [number(parts[0]), number(parts[1], 0.4), number(parts[2], 0.4), alpha] };
    if (name === "oklch") {
      const [L, C, H] = [number(parts[0]), number(parts[1], 0.4), (hue(parts[2]) * Math.PI) / 180];
      return { legacy: false, lab: [L, C * Math.cos(H), C * Math.sin(H), alpha] };
    }
    if (name === "color") {
      const [space, ...rest] = parts;
      const rgb = rest.slice(0, 3).map((part) => number(part)) as [number, number, number];
      if (space === "srgb") return fromSrgb(rgb, alpha, false);
      if (space === "srgb-linear") return { legacy: false, lab: [...linearToLab(rgb), alpha] };
      if (space === "display-p3") {
        const linear = rgb.map(toLinear);
        const srgb = P3_TO_SRGB.map((row) => row.reduce((sum, k, i) => sum + k * item(linear, i), 0)) as [number, number, number];
        return { legacy: false, lab: [...linearToLab(srgb), alpha] };
      }
    }
  }
  if (typeof document === "undefined") throw new Unsupported(`colour ${text}`);
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) throw new Unsupported("canvas");
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = text;
  probe.fillRect(0, 0, 1, 1);
  const data = probe.getImageData(0, 0, 1, 1).data;
  return fromSrgb([item(data, 0) / 255, item(data, 1) / 255, item(data, 2) / 255], item(data, 3) / 255, true);
}

/** A CSS colour string for the canvas, from Oklab (clipped to sRGB). */
function canvasColor([L, a, b, alpha]: Lab): string {
  const [r, g, bl] = labToLinear([L, a, b]).map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 25500) / 100) as [number, number, number];
  return `rgba(${r}, ${g}, ${bl}, ${Math.round(Math.min(1, Math.max(0, alpha)) * 10000) / 10000})`;
}

/** Interpolate premultiplied, in Oklab or in gamma-encoded sRGB. */
export function mix(from: Color, to: Color, t: number, oklab: boolean): Lab {
  const space = (color: Color): Lab => {
    if (oklab) return color.lab;
    const [r, g, b] = labToLinear([color.lab[0], color.lab[1], color.lab[2]]).map(toGamma) as [number, number, number];
    return [r, g, b, color.lab[3]];
  };
  const [x, y] = [space(from), space(to)];
  const alpha = x[3] + (y[3] - x[3]) * t;
  const channel = (i: 0 | 1 | 2) => (alpha === 0 ? 0 : (x[i] * x[3] + (y[i] * y[3] - x[i] * x[3]) * t) / alpha);
  const out: Lab = [channel(0), channel(1), channel(2), alpha];
  if (oklab) return out;
  return [...linearToLab([out[0], out[1], out[2]].map(toLinear) as [number, number, number]), alpha];
}

// ── Gradients ────────────────────────────────────────────────────────────────

/** Split at top-level commas (outside parentheses). */
export function splitTop(text: string, separator = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (depth === 0 && char === separator) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

/** Split at top-level whitespace. */
const words = (text: string) => splitTop(text.replace(/\s+/g, " "), " ");

type Length = { px: number; percent: number };
function length(token: string): Length {
  if (token.endsWith("%")) return { px: 0, percent: parseFloat(token) / 100 };
  if (token.endsWith("px") || token === "0") return { px: parseFloat(token), percent: 0 };
  throw new Unsupported(`length ${token}`);
}
const resolve = (value: Length, size: number) => value.px + value.percent * size;

export interface Stop {
  color: Color;
  position: Length | null;
}

/** Stops with every position resolved and ordered as CSS Images 4 fixes them up. */
export function fixStops(stops: Stop[], size: number): { color: Color; at: number }[] {
  const at: (number | null)[] = stops.map((stop) => (stop.position ? resolve(stop.position, size) : null));
  if (at[0] === null) at[0] = 0;
  if (at[at.length - 1] === null) at[at.length - 1] = size;
  let max = -Infinity;
  for (let i = 0; i < at.length; i += 1) if (at[i] !== null) at[i] = max = Math.max(max, at[i]!);
  for (let i = 1; i < at.length; i += 1) {
    if (at[i] !== null) continue;
    let j = i;
    while (at[j] === null) j += 1;
    const [from, to] = [at[i - 1]!, at[j]!];
    for (let k = i; k < j; k += 1) at[k] = from + ((to - from) * (k - i + 1)) / (j - i + 1);
    i = j;
  }
  return stops.map((stop, i) => ({ color: stop.color, at: at[i]! }));
}

function parseStops(args: string[]): Stop[] {
  const stops: Stop[] = [];
  for (const arg of args) {
    const parts = words(arg);
    const colorEnd = parts.findIndex((part, i) => i > 0 && /^-?[\d.]/.test(part));
    const colorText = (colorEnd === -1 ? parts : parts.slice(0, colorEnd)).join(" ");
    if (/^-?[\d.]/.test(colorText)) throw new Unsupported("colour hint");
    const color = parseColor(colorText);
    const positions = colorEnd === -1 ? [] : parts.slice(colorEnd).map(length);
    if (positions.length === 0) stops.push({ color, position: null });
    for (const position of positions) stops.push({ color, position });
  }
  if (stops.length < 2) throw new Unsupported("fewer than two stops");
  return stops;
}

const STEPS = 16;

const sameHue = (x: Lab, y: Lab) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];

/**
 * Add a gradient's stops to a canvas gradient over [0, size], interpolating as CSS does. The
 * canvas interpolates unpremultiplied sRGB, which matches CSS exactly when only alpha changes
 * (a fade to transparent takes the other end's colour at alpha 0); between two different
 * colours it gets STEPS intermediate stops computed the CSS way.
 */
function addStops(gradient: CanvasGradient, stops: { color: Color; at: number }[], size: number, oklab: boolean) {
  const offset = (at: number) => Math.min(1, Math.max(0, size === 0 ? 0 : at / size));
  if (stops.length === 1) gradient.addColorStop(0, canvasColor(item(stops, 0).color.lab));
  for (let i = 0; i + 1 < stops.length; i += 1) {
    const [from, to] = [item(stops, i), item(stops, i + 1)];
    let [x, y] = [from.color.lab, to.color.lab];
    if (x[3] === 0) x = [y[0], y[1], y[2], 0];
    if (y[3] === 0) y = [x[0], x[1], x[2], 0];
    gradient.addColorStop(offset(from.at), canvasColor(x));
    if (to.at > from.at && !sameHue(x, y))
      for (let k = 1; k < STEPS; k += 1)
        gradient.addColorStop(offset(from.at + ((to.at - from.at) * k) / STEPS), canvasColor(mix(from.color, to.color, k / STEPS, oklab)));
    gradient.addColorStop(offset(to.at), canvasColor(y));
  }
}

const SIDES: Record<string, [number, number]> = { left: [0, 0.5], right: [1, 0.5], top: [0.5, 0], bottom: [0.5, 1], center: [0.5, 0.5] };

/** A two-value background or gradient position in a box. */
function position(tokens: string[], width: number, height: number): [number, number] {
  if (tokens.length === 1) tokens = [item(tokens, 0), "center"];
  if (tokens.length !== 2) throw new Unsupported(`position ${tokens.join(" ")}`);
  let [x, y] = [item(tokens, 0), item(tokens, 1)];
  if (x === "top" || x === "bottom" || y === "left" || y === "right") [x, y] = [y, x];
  const axis = (token: string, size: number, index: 0 | 1) => {
    const side = SIDES[token];
    return side ? side[index] * size : resolve(length(token), size);
  };
  return [axis(x, width, 0), axis(y, height, 1)];
}

/** Draw one gradient over a width × height tile. */
function drawGradient(ctx: CanvasRenderingContext2D, value: string, width: number, height: number) {
  const fn = /^((?:repeating-)?(?:linear|radial)-gradient)\((.*)\)$/s.exec(value.trim());
  if (!fn) throw new Unsupported(`image ${value.slice(0, 40)}`);
  const [, name = "", body = ""] = fn;
  const args = splitTop(body);
  const repeating = name.startsWith("repeating");
  // A leading length, angle or keyword (to, at, circle, ellipse, closest-…, farthest-…) is the
  // gradient's configuration; a colour starts with a letter, a function or "#".
  const config = /^(-?[\d.]|to\b|at\b|circle\b|ellipse\b|closest-|farthest-)/.test(item(args, 0)) ? words(item(args.splice(0, 1), 0)) : [];
  if (config.some((token) => token === "in")) throw new Unsupported("interpolation method");
  const raw = parseStops(args);
  const oklab = raw.some((stop) => !stop.color.legacy);

  if (name.endsWith("linear-gradient")) {
    let angle = 180;
    if (config[0] === "to") {
      const dx = config.includes("left") ? -1 : config.includes("right") ? 1 : 0;
      const dy = config.includes("top") ? -1 : config.includes("bottom") ? 1 : 0;
      angle = dx && dy ? (Math.atan2(dx * height, -dy * width) * 180) / Math.PI : (Math.atan2(dx, -dy) * 180) / Math.PI;
    } else if (config.length) angle = hue(item(config, 0));
    const rad = (angle * Math.PI) / 180;
    const [sx, sy] = [Math.sin(rad), -Math.cos(rad)];
    const line = Math.abs(width * sx) + Math.abs(height * sy);
    const [cx, cy] = [width / 2, height / 2];
    let stops = fixStops(raw, line);
    let [from, to] = [0, line];
    if (repeating) [stops, from, to] = repeat(stops, -line, 2 * line);
    const gradient = ctx.createLinearGradient(cx - (sx * line) / 2 + sx * from, cy - (sy * line) / 2 + sy * from, cx - (sx * line) / 2 + sx * to, cy - (sy * line) / 2 + sy * to);
    addStops(gradient, stops.map((stop) => ({ ...stop, at: stop.at - from })), to - from, oklab);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Radial: [circle | ellipse] [size] [at position]
  const at = config.indexOf("at");
  const [cx, cy] = at === -1 ? [width / 2, height / 2] : position(config.slice(at + 1), width, height);
  const shape = (at === -1 ? config : config.slice(0, at)).filter((token) => token !== "ellipse" && token !== "circle");
  const circle = config.includes("circle") || (shape.length === 1 && !item(shape, 0).includes("-") && !item(shape, 0).endsWith("%"));
  const sides = [cx, width - cx, cy, height - cy] as const;
  let rx: number;
  let ry: number;
  const keyword = shape.find((token) => token.includes("-")) ?? (shape.length ? null : "farthest-corner");
  if (keyword) {
    const [nearX, farX] = [Math.min(sides[0], sides[1]), Math.max(sides[0], sides[1])];
    const [nearY, farY] = [Math.min(sides[2], sides[3]), Math.max(sides[2], sides[3])];
    if (circle) {
      const r =
        keyword === "closest-side" ? Math.min(nearX, nearY)
        : keyword === "farthest-side" ? Math.max(farX, farY)
        : keyword === "closest-corner" ? Math.hypot(nearX, nearY)
        : Math.hypot(farX, farY);
      [rx, ry] = [r, r];
    } else if (keyword === "closest-side") [rx, ry] = [nearX, nearY];
    else if (keyword === "farthest-side") [rx, ry] = [farX, farY];
    else {
      // Corners: the side ellipse's aspect ratio, scaled to pass through the corner.
      const [x, y] = keyword === "closest-corner" ? [nearX, nearY] : [farX, farY];
      const ratio = keyword === "closest-corner" ? nearX / (nearY || 1) : farX / (farY || 1);
      rx = Math.hypot(x, y * ratio);
      ry = ratio === 0 ? 0 : rx / ratio;
    }
  } else {
    rx = resolve(length(item(shape, 0)), width);
    ry = circle ? rx : resolve(length(shape[1] ?? item(shape, 0)), height);
  }
  if (rx <= 0 || ry <= 0) throw new Unsupported("degenerate radial gradient");
  let stops = fixStops(raw, rx);
  let reach = rx;
  if (repeating) {
    const corners: [number, number][] = [[0, 0], [width, 0], [0, height], [width, height]];
    const far = Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, ((y - cy) * rx) / ry)));
    [stops, , reach] = repeat(stops, 0, far);
  } else reach = Math.max(rx, item(stops, stops.length - 1).at);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
  addStops(gradient, stops, reach, oklab);
  ctx.fillStyle = gradient;
  ctx.fillRect(-cx, (-cy * rx) / ry, width, (height * rx) / ry);
  ctx.restore();
}

/** A repeating gradient's stops, repeated to cover [from, to]. */
function repeat(stops: { color: Color; at: number }[], from: number, to: number): [typeof stops, number, number] {
  const end = item(stops, stops.length - 1);
  const [first, last] = [item(stops, 0).at, end.at];
  const period = last - first;
  if (period <= 0) return [[{ color: end.color, at: from }, { color: end.color, at: to }], from, to];
  const out: typeof stops = [];
  for (let n = Math.floor((from - first) / period); first + n * period < to; n += 1)
    for (const stop of stops) out.push({ color: stop.color, at: stop.at + n * period });
  return [out, item(out, 0).at, item(out, out.length - 1).at];
}

// ── Layers ───────────────────────────────────────────────────────────────────

interface Layer {
  image: string;
  size: string;
  position: string;
  repeat: string;
  attachment: string;
}

const layers = (style: CSSStyleDeclaration): Layer[] => {
  const images = splitTop(style.backgroundImage);
  if (images.length === 1 && images[0] === "none") return [];
  const list = (value: string) => splitTop(value);
  const [sizes, positions, repeats, attachments] = [list(style.backgroundSize), list(style.backgroundPosition), list(style.backgroundRepeat), list(style.backgroundAttachment)];
  return images.map((image, i) => ({
    image,
    size: item(sizes, i % sizes.length),
    position: item(positions, i % positions.length),
    repeat: item(repeats, i % repeats.length),
    attachment: item(attachments, i % attachments.length),
  }));
};

const isSvg = (url: string) => /\.svg(\?|#|$)|^data:image\/svg/i.test(url);

/** Load an image for drawing. An SVG without an intrinsic size is given `size` first. */
async function loadImage(url: string, size?: [number, number]): Promise<HTMLImageElement> {
  let source = url;
  if (isSvg(url) && size) {
    const text = await (await fetch(url)).text();
    const svg = text.replace(/<svg\b([^>]*)>/, (_, attributes: string) => `<svg${attributes.replace(/\s(width|height)="[^"]*"/g, "")} width="${size[0]}" height="${size[1]}">`);
    source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = source;
  try {
    await image.decode();
  } finally {
    if (source !== url) URL.revokeObjectURL(source);
  }
  return image;
}

/** An SVG's intrinsic aspect ratio from its width/height or viewBox. */
async function svgRatio(url: string): Promise<number | null> {
  const text = await (await fetch(url)).text();
  const tag = /<svg\b[^>]*>/.exec(text)?.[0] ?? "";
  const width = parseFloat(/\swidth="([\d.]+)(px)?"/.exec(tag)?.[1] ?? "");
  const height = parseFloat(/\sheight="([\d.]+)(px)?"/.exec(tag)?.[1] ?? "");
  if (width > 0 && height > 0) return width / height;
  const box = /viewBox="([^"]+)"/.exec(tag)?.[1]?.trim().split(/[\s,]+/).map(Number) ?? [];
  const [, , w = 0, h = 0] = box;
  return w > 0 && h > 0 ? w / h : null;
}

/** A layer's tile size in the W × H positioning area (`natural`: a raster image's own size). */
function tileSize(size: string, width: number, height: number, ratio: number | null, natural: [number, number] | null = null): [number, number] {
  const tokens = words(size);
  if (tokens[0] === "cover" || tokens[0] === "contain") {
    if (!ratio) return [width, height];
    const scale = tokens[0] === "cover" ? Math.max(width / ratio, height) : Math.min(width / ratio, height);
    return [scale * ratio, scale];
  }
  const [x = "auto", y = "auto"] = tokens;
  let w = x === "auto" ? null : resolve(length(x), width);
  let h = y === "auto" ? null : resolve(length(y), height);
  if (w === null && h === null) [w, h] = natural ?? (ratio ? [width, width / ratio] : [width, height]);
  else if (w === null) w = ratio ? h! * ratio : width;
  else if (h === null) h = ratio ? w / ratio : height;
  return [w!, h!];
}

/** Let input and rendering in between the bake's steps. */
const pause = () => new Promise<void>((done) => setTimeout(done, 0));

/** Draw the page canvas: colour, then layers bottom to top. */
async function drawCanvas(ctx: CanvasRenderingContext2D, canvas: Element, width: number, height: number) {
  const style = getComputedStyle(canvas);
  ctx.fillStyle = canvasColor(parseColor(style.backgroundColor).lab);
  ctx.fillRect(0, 0, width, height);
  for (const layer of layers(style).reverse()) {
    if (layer.attachment !== "fixed") throw new Unsupported("a canvas layer that scrolls");
    const url = /^url\("?(.*?)"?\)$/.exec(layer.image)?.[1];
    let image: HTMLImageElement | null = null;
    let natural: [number, number] | null = null;
    let ratio: number | null = null;
    if (url && isSvg(url)) ratio = await svgRatio(url);
    else if (url) {
      image = await loadImage(url);
      natural = [image.naturalWidth, image.naturalHeight];
      ratio = natural[1] ? natural[0] / natural[1] : null;
    }
    const [tw, th] = tileSize(layer.size, width, height, ratio, natural);
    if (url && isSvg(url)) image = await loadImage(url, [Math.max(1, Math.round(tw)), Math.max(1, Math.round(th))]);
    if (tw <= 0 || th <= 0) continue;
    const [px, py] = position(words(layer.position), width - tw, height - th);
    if (/space|round/.test(layer.repeat)) throw new Unsupported(`background-repeat ${layer.repeat}`);
    const [rx, ry] = [layer.repeat.includes("repeat-x") || layer.repeat.startsWith("repeat"), layer.repeat.includes("repeat-y") || layer.repeat.startsWith("repeat")];
    // A tile that covers the window is drawn once, in place: only its visible part is rendered.
    if ((!rx || (px <= 0 && px + tw >= width)) && (!ry || (py <= 0 && py + th >= height))) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
      ctx.translate(px, py);
      if (image) ctx.drawImage(image, 0, 0, tw, th);
      else drawGradient(ctx, layer.image, tw, th);
      ctx.restore();
      await pause();
      continue;
    }
    const tile = document.createElement("canvas");
    tile.width = Math.max(1, Math.round(tw));
    tile.height = Math.max(1, Math.round(th));
    const tctx = tile.getContext("2d")!;
    if (image) tctx.drawImage(image, 0, 0, tile.width, tile.height);
    else drawGradient(tctx, layer.image, tile.width, tile.height);
    const pattern = ctx.createPattern(tile, rx && ry ? "repeat" : rx ? "repeat-x" : ry ? "repeat-y" : "no-repeat")!;
    pattern.setTransform(new DOMMatrix().translateSelf(px, py));
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    await pause();
  }
}

/** Silk's line overlay, drawn at the frost's own scale: the blur leaves no finer detail. */
async function drawSilk(ctx: CanvasRenderingContext2D, silk: Element | null, width: number, height: number, scale: number) {
  if (!silk || getComputedStyle(silk).display === "none") return;
  const silkStyle = getComputedStyle(silk);
  const mask = /url\("?(.*?)"?\)/.exec(silkStyle.maskImage || silkStyle.getPropertyValue("-webkit-mask-image"))?.[1];
  if (!mask) return;
  const ratio = await svgRatio(mask);
  const [tw, th] = tileSize(silkStyle.maskSize || "cover", width, height, ratio);
  const [px, py] = position(words(silkStyle.maskPosition || "50% 50%"), width - tw, height - th);
  const lines = await loadImage(mask, [Math.max(1, Math.round(tw * scale)), Math.max(1, Math.round(th * scale))]);
  await pause();
  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const lctx = layer.getContext("2d")!;
  lctx.drawImage(lines, px * scale, py * scale, tw * scale, th * scale);
  lctx.globalCompositeOperation = "source-in";
  lctx.fillStyle = canvasColor(parseColor(silkStyle.backgroundColor).lab);
  lctx.fillRect(0, 0, layer.width, layer.height);
  ctx.globalAlpha = parseFloat(silkStyle.opacity) || 0;
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 1;
}

/** The scale baked images are stored at: blurred detail is far coarser than a pixel. */
export const FROST_SCALE = 0.5;

export interface FrostFilter {
  blur: number;
  saturate: number;
}

/**
 * Render the canvas once and return one PNG per filter, at FROST_SCALE of the viewport.
 * Edges extend the outermost pixels, so the frost does not darken at the window's edges.
 */
export async function renderFrost(canvas: Element, silk: Element | null, width: number, height: number, filters: FrostFilter[]): Promise<Blob[]> {
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  await drawCanvas(source.getContext("2d")!, canvas, width, height);
  const [w, h] = [Math.ceil(width * FROST_SCALE), Math.ceil(height * FROST_SCALE)];
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(source, 0, 0, w, h);
  source.width = source.height = 0;
  await drawSilk(sctx, silk, width, height, FROST_SCALE);
  await pause();
  const pad = Math.ceil(3 * Math.max(...filters.map((filter) => filter.blur)) * FROST_SCALE) + 1;
  const padded = document.createElement("canvas");
  padded.width = w + 2 * pad;
  padded.height = h + 2 * pad;
  const pctx = padded.getContext("2d")!;
  pctx.drawImage(small, pad, pad);
  pctx.drawImage(small, 0, 0, w, 1, pad, 0, w, pad);
  pctx.drawImage(small, 0, h - 1, w, 1, pad, pad + h, w, pad);
  pctx.drawImage(padded, pad, 0, 1, h + 2 * pad, 0, 0, pad, h + 2 * pad);
  pctx.drawImage(padded, pad + w - 1, 0, 1, h + 2 * pad, pad + w, 0, pad, h + 2 * pad);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  if (!("filter" in octx)) throw new Unsupported("canvas filters");
  const blobs: Blob[] = [];
  for (const filter of filters) {
    await pause();
    octx.clearRect(0, 0, w, h);
    octx.filter = `blur(${filter.blur * FROST_SCALE}px) saturate(${filter.saturate})`;
    octx.drawImage(padded, -pad, -pad);
    octx.filter = "none";
    blobs.push(await new Promise<Blob>((done, fail) => out.toBlob((blob) => (blob ? done(blob) : fail(new Unsupported("toBlob"))), "image/png")));
  }
  return blobs;
}
