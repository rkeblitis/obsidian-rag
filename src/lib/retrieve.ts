import { cosineSimilarity } from "./similarity.js";
import type { EmbeddedChunk } from "./types.js";

/** One chunk from the index with its cosine score vs. a question embedding (higher = more similar). */
export type ScoredEmbeddedChunk = {
  chunk: EmbeddedChunk;
  score: number;
};

/** Sort every indexed chunk by cosine similarity to `questionVector` (best match first). */
export function rankEmbeddedChunksByCosine(
  questionVector: number[],
  chunks: EmbeddedChunk[],
): ScoredEmbeddedChunk[] {
  return chunks
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(questionVector, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score);
}
