import { writeFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  embeddingsFilePath,
  ollamaBaseUrl,
  requireVaultPath,
  resolveUserPath,
} from "./config.js";
import { chunkNote, loadVault, type Chunk } from "./lib/vault.js";

type EmbeddedChunk = Chunk & {
  embedding: number[];
};

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

  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}

async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;

    // Progress indicator
    if (i % 10 === 0) {
      console.log(`  Embedded ${i}/${chunks.length}...`);
    }

    const embedding = await embed(chunk.text);
    results.push({ ...chunk, embedding });
  }

  console.log(`  Embedded ${chunks.length}/${chunks.length} ✓`);
  return results;
}

async function main() {
  const vaultPath = requireVaultPath();
  const outputPath = resolveUserPath(embeddingsFilePath());
  console.log("Loading vault (path from VAULT_PATH in .env)...");

  const notes = await loadVault(vaultPath);
  console.log(`Loaded ${notes.length} notes\n`);

  console.log("Chunking...");
  const allChunks: Chunk[] = [];
  for (const note of notes) {
    allChunks.push(...chunkNote(note));
  }
  const chunksForIndex = allChunks.map(c => ({
    ...c,
    notePath: relative(vaultPath, c.notePath),
  }));
  console.log(`Created ${chunksForIndex.length} chunks\n`);

  console.log(`Embedding ${chunksForIndex.length} chunks...`);
  const startTime = Date.now();
  const embedded = await embedChunks(chunksForIndex);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s\n`);

  // Save to disk
  console.log(`Saving to ${outputPath}...`);
  await writeFile(outputPath, JSON.stringify(embedded, null, 2));

  // Stats
  const fileSize = (Buffer.byteLength(JSON.stringify(embedded)) / 1024 / 1024).toFixed(2);
  console.log(`Saved ${embedded.length} embedded chunks (${fileSize} MB)`);
}

main().catch(console.error);
