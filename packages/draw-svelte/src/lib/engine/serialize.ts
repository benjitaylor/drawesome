import { dotRadius, eraseLayers, polylinePath, strokePath } from "./geometry.js";
import { PEN_BY_ID } from "./pens.js";
import type { Stroke } from "./types.js";

/** Escape a value destined for an XML attribute. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The visible mark for one stroke — a filled outline, or a circle when the
 * stroke was too short to produce one (a tap).
 */
function strokeMarkup(stroke: Stroke): string {
  const style =
    PEN_BY_ID[stroke.pen].blend === "multiply"
      ? ` style="mix-blend-mode:multiply"`
      : "";
  const paint = `fill="${esc(stroke.color)}" fill-opacity="${stroke.opacity}"${style}`;

  const d = strokePath(
    stroke.pen,
    stroke.size,
    stroke.points,
    true,
    stroke.shape,
  );
  if (d) return `<path d="${d}" ${paint}/>`;

  if (stroke.points.length) {
    const [x, y] = stroke.points[0];
    return `<circle cx="${x}" cy="${y}" r="${dotRadius(stroke.size)}" ${paint}/>`;
  }
  return "";
}

function backgroundMarkup(
  background: string | null,
  width: number,
  height: number,
): string {
  if (!background || background === "transparent") return "";
  return `<rect width="${width}" height="${height}" fill="${esc(background)}"/>`;
}

/** Serialize the board + strokes into a standalone, static SVG string. */
export function toSvg(
  strokes: Stroke[],
  width: number,
  height: number,
  background: string | null,
): string {
  const layers = eraseLayers(strokes);

  const body = layers
    .map((layer, i) => {
      const ink = layer.ink
        .map((n) => strokeMarkup(strokes[n]))
        .filter(Boolean)
        .join("");
      if (!ink) return "";
      if (!layer.erasers.length) return ink;

      const id = `e${i}`;
      const cuts = layer.erasers
        .map((n) => {
          const s = strokes[n];
          return (
            `<path d="${polylinePath(s.points)}" stroke="#000" stroke-width="${s.size}"` +
            ` stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
          );
        })
        .join("");

      return (
        `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">` +
        `<rect width="${width}" height="${height}" fill="#fff"/>${cuts}</mask>` +
        `<g mask="url(#${id})">${ink}</g>`
      );
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    backgroundMarkup(background, width, height) +
    body +
    `</svg>`
  );
}

/** Rasterise the drawing to a PNG blob. */
export async function toPng(
  strokes: Stroke[],
  width: number,
  height: number,
  background: string | null,
  scale = 2,
): Promise<Blob> {
  const svg = toSvg(strokes, width, height, background);
  // Encoded rather than base64'd so the markup survives any non-ASCII in it.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const img = new Image();
  // The data URL is same-origin, but marking it keeps the canvas untainted on
  // the strictest engines, so toBlob can't fail with a security error.
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterise the drawing"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not encode the PNG")),
      "image/png",
    );
  });
}
