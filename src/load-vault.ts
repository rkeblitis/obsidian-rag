/**
 * Vault stats CLI: load notes (./lib/vault.ts) and print aggregate length stats (no chunking or embeddings).
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/load-vault.ts`.
 */
import { requireVaultPath } from "./config.js";
import { loadVault } from "./lib/vault.js";

async function main() {
  const vaultPath = requireVaultPath();
  console.log("Loading vault (path from VAULT_PATH in .env)...\n");

  const notes = await loadVault(vaultPath);

  // Show stats 
  console.log(`Loaded ${notes.length} notes with real content\n`);
  const totalChars = notes.reduce((sum, n) => sum + n.content.length, 0);
  const avgChars = Math.round(totalChars / notes.length);
  const longest = notes.reduce((max, n) => (n.content.length > max.content.length ? n : max));
  const shortest = notes.reduce((min, n) => (n.content.length < min.content.length ? n : min));

  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`Average note length: ${avgChars} chars`);
  console.log(`Longest note: ${longest.path.split("/").pop()} (${longest.content.length} chars)`);
  console.log(`Shortest note: ${shortest.path.split("/").pop()} (${shortest.content.length} chars)`);
}

main().catch(console.error);
