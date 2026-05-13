/**
 * Index build CLI: load vault notes (./lib/vault.ts), chunk, embed each chunk via Ollama, write embeddings.json.
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/embed-vault.ts` (requires .env VAULT_PATH, Ollama up).
 */
import { writeFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  requireVaultPath,
  resolvedEmbeddingsFilePath,
} from "./config.js";
import type { Chunk, EmbeddedChunk } from "./lib/types.js";
import { embedText } from "./lib/ollama/embed.js";
import { chunkNote, loadVault } from "./lib/vault.js";

async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;

    // Progress indicator
    if (i % 10 === 0) {
      console.log(`  Embedded ${i}/${chunks.length}...`);
    }

    const embedding = await embedText(chunk.text);
    results.push({ ...chunk, embedding });
  }

  console.log(`  Embedded ${chunks.length}/${chunks.length} ✓`);
  return results;
}

// Build or Refresh the index
async function main() {
  const vaultPath = requireVaultPath();
  const outputPath = resolvedEmbeddingsFilePath();
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
