/**
 * tokens:allow-file colour maths: custom colours become palette parameters.
 *
 * A person's own colours are read as OKLCH and turned into the same parameters a palette
 * sets in themes.css (`--accent-h`, `--neutral-h`, …), so every role keeps its formula. The
 * accent's lightness is moved until text on it reaches 4.6:1, and light-mode accent text is
 * capped (`--accent-text-max-l`) until it reaches 4.8:1 on the canvas.
 *
 * appearanceBootScript carries an ES5 copy of this file (BOOT_CUSTOM_COLOUR); the boot test
 * in appearance.test.ts proves both give the same result. Change them together.
 */

/** Custom colour inputs: an accent, an optional second accent and a canvas tint, as hex. */
export interface CustomColours {
  accentColor: string | null;
  accentColor2: string | null;
  canvasTint: string | null;
}

/** The palette parameters custom colours may set, in the order they are applied. */
export const CUSTOM_COLOUR_VARS = [
  "--accent-h",
  "--accent-c",
  "--accent-l",
  "--accent-fg-l",
  "--accent-2-h",
  "--accent-text-max-l",
  "--neutral-h",
  "--neutral-c",
  "--ambient-1-h",
  "--ambient-2-h",
  "--ambient-3-h",
] as const;

/** A hex colour (`#rgb` or `#rrggbb`, any case) as lower-case `#rrggbb`, or null. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1]!.toLowerCase();
  return `#${hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex}`;
}

/** OKLCH lightness, chroma and hue (degrees) of a `#rrggbb` colour. */
export function hexToOklch(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = lin((n >> 16) & 255);
  const g = lin((n >> 8) & 255);
  const b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.sqrt(A * A + B * B), h < 0 ? h + 360 : h];
}

/** Relative luminance (WCAG) of an OKLCH colour, clipped to sRGB. */
function luminance(L: number, C: number, h: number) {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const clip = (v: number) => Math.min(1, Math.max(0, v));
  return (
    0.2126 * clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) +
    0.7152 * clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) +
    0.0722 * clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  );
}

const ratio = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
const round = (value: number, places: number) => String(Math.round(value * 10 ** places) / 10 ** places);
const hue = (value: number) => round(((value % 360) + 360) % 360, 1);

/**
 * The palette parameters for custom colours, as CSS custom properties. An accent sets the
 * accent parameters (a second accent only sets the second hue, and only with an accent); a
 * canvas tint sets the neutral and ambient hues. Empty when no colour is set.
 */
export function customColourVars({ accentColor, accentColor2, canvasTint }: CustomColours): Record<string, string> {
  const vars: Record<string, string> = {};
  const accent = normalizeHex(accentColor);
  if (accent) {
    const [L, C, H] = hexToOklch(accent);
    const c = Math.round(Math.min(C, 0.25) * 1000) / 1000;
    const h = Math.round(H * 10) / 10;
    const second = normalizeHex(accentColor2);
    const h2 = second ? Math.round(hexToOklch(second)[2] * 10) / 10 : (h + 335) % 360;
    // Lightness in thousandths, so both copies of this code step through identical values.
    let l = Math.round(Math.min(0.8, Math.max(0.4, L)) * 1000);
    const light = l <= 660;
    const text = luminance(light ? 0.99 : 0.2, 0.005, h);
    const worst = (at: number) => Math.min(ratio(text, luminance(at / 1000, c, h)), ratio(text, luminance(at / 1000, c, h2)));
    if (light) while (l > 300 && worst(l) < 4.6) l -= 10;
    else while (l < 950 && worst(l) < 4.6) l += 10;
    const canvas = luminance(0.94, 0, 0);
    let t = l - 50;
    while (t > 200 && ratio(luminance(t / 1000, c, h), canvas) < 4.8) t -= 10;
    vars["--accent-h"] = round(h, 1);
    vars["--accent-c"] = round(c, 3);
    vars["--accent-l"] = round(l / 1000, 3);
    vars["--accent-fg-l"] = light ? "0.99" : "0.2";
    vars["--accent-2-h"] = hue(h2);
    vars["--accent-text-max-l"] = round(t / 1000, 3);
  }
  const tint = normalizeHex(canvasTint);
  if (tint) {
    const [, C, H] = hexToOklch(tint);
    vars["--neutral-h"] = hue(H);
    vars["--neutral-c"] = round(Math.min(0.03, C * 0.25), 3);
    vars["--ambient-1-h"] = hue(H);
    vars["--ambient-2-h"] = hue(H - 35);
    vars["--ambient-3-h"] = hue(H + 40);
  }
  return vars;
}

/**
 * The same as customColourVars, as an ES5 function body for the boot script: given the three
 * colours (`a`, `b`, `t`), it returns the variables as an object.
 */
export const BOOT_CUSTOM_COLOUR = `function(a,b,t){var v={};
function x(s){if(typeof s!=="string")return null;var m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());if(!m)return null;var h=m[1].toLowerCase();return "#"+(h.length===3?h.replace(/./g,function(c){return c+c}):h)}
function k(hex){var n=parseInt(hex.slice(1),16);function q(z){var c=z/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}var r=q((n>>16)&255),g=q((n>>8)&255),bb=q(n&255);
var l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*bb),m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*bb),s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*bb);
var L=0.2104542553*l+0.793617785*m-0.0040720468*s,A=1.9779984951*l-2.428592205*m+0.4505937099*s,B=0.0259040371*l+0.7827717662*m-0.808675766*s,h=Math.atan2(B,A)*180/Math.PI;return [L,Math.sqrt(A*A+B*B),h<0?h+360:h]}
function y(L,C,h){var rad=h*Math.PI/180,aa=C*Math.cos(rad),bb=C*Math.sin(rad),l=Math.pow(L+0.3963377774*aa+0.2158037573*bb,3),m=Math.pow(L-0.1055613458*aa-0.0638541728*bb,3),s=Math.pow(L-0.0894841775*aa-1.291485548*bb,3);
function c(z){return Math.min(1,Math.max(0,z))}return 0.2126*c(4.0767416621*l-3.3077115913*m+0.2309699292*s)+0.7152*c(-1.2684380046*l+2.6097574011*m-0.3413193965*s)+0.0722*c(-0.0041960863*l-0.7034186147*m+1.707614701*s)}
function o(p,q){return (Math.max(p,q)+0.05)/(Math.min(p,q)+0.05)}
function d(z,p){return String(Math.round(z*Math.pow(10,p))/Math.pow(10,p))}
function u(z){return d(((z%360)+360)%360,1)}
var ac=x(a);if(ac){var K=k(ac),c=Math.round(Math.min(K[1],0.25)*1000)/1000,h=Math.round(K[2]*10)/10,sc=x(b),h2=sc?Math.round(k(sc)[2]*10)/10:(h+335)%360;
var l=Math.round(Math.min(0.8,Math.max(0.4,K[0]))*1000),lt=l<=660,tx=y(lt?0.99:0.2,0.005,h);
function w(at){return Math.min(o(tx,y(at/1000,c,h)),o(tx,y(at/1000,c,h2)))}
if(lt){while(l>300&&w(l)<4.6)l-=10}else{while(l<950&&w(l)<4.6)l+=10}
var cv=y(0.94,0,0),tt=l-50;while(tt>200&&o(y(tt/1000,c,h),cv)<4.8)tt-=10;
v["--accent-h"]=d(h,1);v["--accent-c"]=d(c,3);v["--accent-l"]=d(l/1000,3);v["--accent-fg-l"]=lt?"0.99":"0.2";v["--accent-2-h"]=u(h2);v["--accent-text-max-l"]=d(tt/1000,3)}
var ti=x(t);if(ti){var T=k(ti);v["--neutral-h"]=u(T[2]);v["--neutral-c"]=d(Math.min(0.03,T[1]*0.25),3);v["--ambient-1-h"]=u(T[2]);v["--ambient-2-h"]=u(T[2]-35);v["--ambient-3-h"]=u(T[2]+40)}
return v}`;
