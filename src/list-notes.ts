/**
 * Vault explorer CLI: list markdown paths under VAULT_PATH and print sizes for the first few files.
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/list-notes.ts`.
 */
import { stat } from "node:fs/promises";
import { requireVaultPath } from "./config.js";
import { findMarkdownFiles } from "./lib/vault.js";

async function main() {
  const vaultPath = requireVaultPath();
  console.log("Scanning vault (path from VAULT_PATH in .env)...\n");

  const files = await findMarkdownFiles(vaultPath);
  console.log(`Found ${files.length} markdown files\n`);

  // Print first 10 with their sizes
  for (const file of files.slice(0, 10)) {
    const info = await stat(file);
    const sizeKB = (info.size / 1024).toFixed(1);
    console.log(`  ${file}  (${sizeKB} KB)`);
  }

  if (files.length > 10) {
    console.log(`  ... and ${files.length - 10} more`);
  }
}

main().catch(console.error);
