//  Test to embed one string to cofirm pipline is wried before we scale u[] 
// What this test does NOT test:

// Whether the embeddings are good (you'd need to compare them to other embeddings for that)
// Whether semantic similarity is working
// Whether retrieval will be accurate

// What this test DOES test:

// Ollama is running and reachable at localhost:11434
// The nomic-embed-text model is installed and loads
// Your TypeScript code can make HTTP requests to it
// The response shape matches what you expected
// A 768-dimensional vector actually comes back

import { ollamaBaseUrl } from "./config.js";

async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${ollamaBaseUrl()}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  // Ideally we'd validate this response of embedding: number[] with Zod since we lose
  // typescript at runtime
  // Type assertion only — TS types disappear at runtime, so this isn't validated.
  // In production, validate the response shape with Zod (or similar).
  const data = await response.json() as { embedding: number[] }; 
  return data.embedding;
}

async function main() {
  const text = "The quick brown fox jumps over the lazy dog.";

  console.log(`Embedding: "${text}"`);
  const vector = await embed(text);

  console.log(`\nGot vector with ${vector.length} dimensions`);
  console.log(`First 10 values: [${vector.slice(0, 10).map(n => n.toFixed(4)).join(", ")}, ...]`);
  console.log(`Last 5 values:   [..., ${vector.slice(-5).map(n => n.toFixed(4)).join(", ")}]`);
}

main().catch(console.error);