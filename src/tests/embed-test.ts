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

import { embedText } from "../lib/ollama/embed.js";

async function main() {
  const text = "The quick brown fox jumps over the lazy dog.";

  console.log(`Embedding: "${text}"`);
  const vector = await embedText(text);

  console.log(`\nGot vector with ${vector.length} dimensions`);
  console.log(`First 10 values: [${vector.slice(0, 10).map(n => n.toFixed(4)).join(", ")}, ...]`);
  console.log(`Last 5 values:   [..., ${vector.slice(-5).map(n => n.toFixed(4)).join(", ")}]`);
}

main().catch(console.error);