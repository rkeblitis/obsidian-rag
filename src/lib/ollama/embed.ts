/**
 * POST /api/embeddings on local Ollama (`ollamaBaseUrl` from config). Checks HTTP status before parsing JSON.
 *
 * Cosine similarity assumes vectors from the same embedding model and dimension; mixing models
 * in the index vs. at query time is not a meaningful comparison.
 */
import { embeddingModel, ollamaBaseUrl } from "../../config.js";

export async function embedText(
  prompt: string,
  model: string = embeddingModel(),
): Promise<number[]> {
  const response = await fetch(`${ollamaBaseUrl()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}
