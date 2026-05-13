import { readFile } from "node:fs/promises";
import { resolvedEmbeddingsFilePath } from "../config.js";
import type { EmbeddedChunk } from "./types.js";

/** Load parsed chunks + vectors from the configured embeddings JSON file. */
export async function loadEmbeddedChunks(): Promise<EmbeddedChunk[]> {
  const raw = await readFile(resolvedEmbeddingsFilePath(), "utf-8");
  return JSON.parse(raw) as EmbeddedChunk[];
}
