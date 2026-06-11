import { createHash } from "node:crypto";

export function hashEmbeddingText(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function encodeFloat32Vector(vector: number[]) {
  return Buffer.from(new Float32Array(vector).buffer);
}

export function decodeFloat32Vector(blob: Buffer | Uint8Array) {
  const bytes = blob instanceof Buffer ? blob : Buffer.from(blob);
  const view = new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
  return Array.from(view);
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function buildCatalogueEmbeddingText(input: {
  title: string;
  mediaType: string;
  genres: string[];
  tags: string[];
  description: string | null;
}) {
  const synopsis = stripHtml(input.description ?? "").slice(0, 2000);

  return [
    `Title: ${input.title}`,
    `Media type: ${input.mediaType}`,
    `Genres: ${input.genres.join(", ") || "none"}`,
    `Tags: ${input.tags.join(", ") || "none"}`,
    `Synopsis: ${synopsis}`,
  ].join("\n");
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
