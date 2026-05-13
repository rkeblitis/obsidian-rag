/**
 * POST /api/embeddings on local Ollama (`ollamaBaseUrl` from config). Checks HTTP status before parsing JSON.
 *
 * Note to remember: Cosine similarity assumes vectors from the same embedding model and dimension; mixing models
 * in the index vs. at query time is not a meaningful comparison.
 */
import { ollamaBaseUrl } from "../../config.js";

const DEFAULT_EMBED_MODEL = "nomic-embed-text";

export async function embedText(
  prompt: string,
  model: string = DEFAULT_EMBED_MODEL,
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
