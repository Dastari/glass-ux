#!/usr/bin/env node
/**
 * Fictional sample media for the media player's catalogue page and browser specs. It lives in
 * src/gallery/assets/media, so it reaches dist/gallery only and pack-release leaves it out.
 *
 * Frames are painted on a canvas in headless Chromium and piped as JPEG to Playwright's ffmpeg,
 * which encodes VP9 (the only video encoder it has). That build has no audio encoder, so the
 * sound is an Opus recording made in the same browser with MediaRecorder and muxed by stream
 * copy. Everything is drawn or synthesised here: there is no source footage or recording.
 *
 *   LD_LIBRARY_PATH=… node scripts/build-media-fixtures.mjs
 *   FFMPEG=/path/to/ffmpeg overrides ~/.cache/ms-playwright/ffmpeg-1013/ffmpeg-linux
 */
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"

const root = resolve(import.meta.dirname, "..")
const out = join(root, "src/gallery/assets/media")
const ffmpeg = process.env.FFMPEG ?? join(homedir(), ".cache/ms-playwright/ffmpeg-1013/ffmpeg-linux")
const WIDTH = 640
const HEIGHT = 360
const FPS = 12
const COLUMNS = 5

/** Two clips: a long one with chapters and sound, and a short one for the next playlist item. */
const CLIPS = [
  { name: "tide-survey", seconds: 24, palette: ["#16324f", "#2a6f97", "#f4a259"], chapters: ["Low water", "Flood", "High water"] },
  { name: "ridge-walk", seconds: 8, palette: ["#2b2d42", "#6a4c93", "#f2cc8f"], chapters: ["Ridge"] },
]

/** Runs in the page: one frame of layered waves, a sun, a large clock and the chapter's name. */
function paint(context, { time, seconds, palette, chapters, width, height }) {
  const [deep, mid, sun] = palette
  const sky = context.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, deep)
  sky.addColorStop(1, mid)
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)
  context.fillStyle = sun
  context.beginPath()
  context.arc(width * (0.12 + (0.76 * time) / seconds), height * 0.34, height * 0.09, 0, Math.PI * 2)
  context.fill()
  for (let layer = 0; layer < 3; layer += 1) {
    context.globalAlpha = 0.28 + layer * 0.2
    context.fillStyle = layer === 2 ? deep : mid
    context.beginPath()
    context.moveTo(0, height)
    for (let x = 0; x <= width; x += 8) {
      const phase = x / (70 + layer * 34) + time * (0.8 + layer * 0.35)
      context.lineTo(x, height * (0.62 + layer * 0.1) + Math.sin(phase) * (16 - layer * 3))
    }
    context.lineTo(width, height)
    context.fill()
  }
  context.globalAlpha = 1
  const whole = Math.floor(time)
  const chapter = chapters[Math.min(chapters.length - 1, Math.floor((time / seconds) * chapters.length))]
  context.fillStyle = "#ffffff"
  context.textAlign = "center"
  context.font = "600 56px system-ui, sans-serif"
  context.fillText(`0:${String(whole).padStart(2, "0")}`, width / 2, height * 0.56)
  context.font = "500 20px system-ui, sans-serif"
  context.fillText(chapter, width / 2, height * 0.66)
}

/** Runs in the page: `seconds` of a quiet two-voice pattern, recorded to Opus in real time. */
async function record({ seconds, root: base }) {
  const context = new AudioContext()
  await context.resume()
  const destination = context.createMediaStreamDestination()
  const master = context.createGain()
  master.gain.value = 0.22
  master.connect(destination)
  const start = context.currentTime + 0.05
  for (let step = 0; step * 0.5 < seconds; step += 1) {
    const voice = context.createOscillator()
    const envelope = context.createGain()
    voice.type = "sine"
    voice.frequency.value = base * 2 ** ([0, 4, 7, 12, 7, 4][step % 6] / 12)
    envelope.gain.setValueAtTime(0, start + step * 0.5)
    envelope.gain.linearRampToValueAtTime(1, start + step * 0.5 + 0.03)
    envelope.gain.exponentialRampToValueAtTime(0.01, start + step * 0.5 + 0.45)
    voice.connect(envelope).connect(master)
    voice.start(start + step * 0.5)
    voice.stop(start + step * 0.5 + 0.48)
  }
  const recorder = new MediaRecorder(destination.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 24_000 })
  const chunks = []
  recorder.ondataavailable = (event) => chunks.push(event.data)
  const stopped = new Promise((done) => (recorder.onstop = done))
  recorder.start()
  await new Promise((done) => setTimeout(done, seconds * 1000 + 150))
  recorder.stop()
  await stopped
  const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer())
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
}

function encode(frames, target) {
  return new Promise((done, fail) => {
    const child = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0", "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-b:v", "0", "-crf", "42", "-g", String(FPS), "-row-mt", "1", "-deadline", "good", "-cpu-used", "3", "-an", target], { stdio: ["pipe", "inherit", "inherit"] })
    child.on("exit", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited with ${code}`))))
    ;(async () => {
      for (const frame of frames) if (!child.stdin.write(frame)) await new Promise((drain) => child.stdin.once("drain", drain))
      child.stdin.end()
    })()
  })
}

mkdirSync(out, { recursive: true })
const scratch = mkdtempSync(join(tmpdir(), "glass-ux-media-"))
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage()
await page.setContent("<!doctype html><canvas></canvas>")
await page.evaluate(`window.paint = ${paint.toString()}; window.record = ${record.toString()}`)

for (const clip of CLIPS) {
  const frames = []
  const total = clip.seconds * FPS
  for (let index = 0; index < total; index += 1) {
    const data = await page.evaluate(
      ({ clip, index, width, height, fps }) => {
        const canvas = document.querySelector("canvas")
        canvas.width = width
        canvas.height = height
        window.paint(canvas.getContext("2d"), { ...clip, time: index / fps, width, height })
        return canvas.toDataURL("image/jpeg", 0.86)
      },
      { clip, index, width: WIDTH, height: HEIGHT, fps: FPS },
    )
    frames.push(Buffer.from(data.split(",")[1], "base64"))
  }
  const silent = join(scratch, `${clip.name}-video.webm`)
  await encode(frames, silent)
  const voice = join(scratch, `${clip.name}-audio.webm`)
  writeFileSync(voice, Buffer.from(await page.evaluate(`window.record(${JSON.stringify({ seconds: clip.seconds, root: clip.name === "ridge-walk" ? 196 : 262 })})`), "base64"))
  const mux = spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-i", silent, "-i", voice, "-c", "copy", "-shortest", join(out, `${clip.name}.webm`)], { stdio: "inherit" })
  if (mux.status !== 0) throw new Error("ffmpeg could not mux the clip")
  if (clip.name === "ridge-walk") spawnSync(ffmpeg, ["-y", "-loglevel", "error", "-i", voice, "-c", "copy", join(out, "tone.webm")], { stdio: "inherit" })

  // The poster is the first frame after the sun has moved; the storyboard is one tile per two seconds.
  writeFileSync(join(out, `${clip.name}-poster.jpg`), frames[Math.min(frames.length - 1, FPS * 2)])
  if (clip.name === "tide-survey") {
    const tiles = clip.seconds / 2
    const sheet = await page.evaluate(
      async ({ clip, tiles, columns, width, height }) => {
        const canvas = document.createElement("canvas")
        canvas.width = columns * 160
        canvas.height = Math.ceil(tiles / columns) * 90
        const sheetContext = canvas.getContext("2d")
        const tile = document.createElement("canvas")
        tile.width = width
        tile.height = height
        for (let index = 0; index < tiles; index += 1) {
          window.paint(tile.getContext("2d"), { ...clip, time: index * 2, width, height })
          sheetContext.drawImage(tile, (index % columns) * 160, Math.floor(index / columns) * 90, 160, 90)
        }
        return canvas.toDataURL("image/jpeg", 0.7)
      },
      { clip, tiles, columns: COLUMNS, width: WIDTH, height: HEIGHT },
    )
    writeFileSync(join(out, `${clip.name}-storyboard.jpg`), Buffer.from(sheet.split(",")[1], "base64"))
  }
}
await browser.close()
rmSync(scratch, { recursive: true, force: true })
for (const file of ["tide-survey.webm", "ridge-walk.webm", "tone.webm", "tide-survey-poster.jpg", "ridge-walk-poster.jpg", "tide-survey-storyboard.jpg"]) {
  console.log(`${file}: ${(statSync(join(out, file)).size / 1024).toFixed(1)} KB`)
}
