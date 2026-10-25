/**
 * Prepare a person's picture for the `image` background: decode it, scale it so its longer
 * edge is at most `maxEdge` pixels, and encode it as a compact data URL that fits in stored
 * preferences (localStorage holds about 5 MB per site).
 */
export interface PrepareBackgroundImageOptions {
  /** The longest edge kept, in pixels. Default 2560. */
  maxEdge?: number;
  /** Encoder quality, 0–1. Default 0.82. */
  quality?: number;
}

/**
 * A downsized `data:image/webp` (or JPEG, where WebP encoding is unavailable) URL for
 * `Appearance.backgroundImage`. Rejects when the file is not an image the browser can decode.
 */
export async function prepareBackgroundImage(file: Blob, { maxEdge = 2560, quality = 0.82 }: PrepareBackgroundImageOptions = {}): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("glass-ux: no 2D canvas to prepare the picture");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", quality);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
