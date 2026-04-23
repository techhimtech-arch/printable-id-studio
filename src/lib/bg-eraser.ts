/** Canvas-based background eraser — paints white rectangles over a background image. */

export interface RectMm {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Erase (white-fill) one or more rectangles from a background image.
 * Coordinates are in millimetres relative to the card (cardWmm × cardHmm).
 * Returns a new PNG data URL.
 */
export function eraseRectsFromImage(
  dataUrl: string,
  rectsMm: RectMm[],
  cardWmm: number,
  cardHmm: number,
  fill: string = "#ffffff",
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!dataUrl) return reject(new Error("No background image"));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 1;
        canvas.height = img.height || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = fill;
        const sx = canvas.width / Math.max(1, cardWmm);
        const sy = canvas.height / Math.max(1, cardHmm);
        for (const r of rectsMm) {
          ctx.fillRect(
            Math.round(r.x * sx),
            Math.round(r.y * sy),
            Math.max(1, Math.round(r.w * sx)),
            Math.max(1, Math.round(r.h * sy)),
          );
        }
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err as Error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load background image"));
    img.src = dataUrl;
  });
}
