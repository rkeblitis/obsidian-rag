import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

// The path to your Obsidian vault
const VAULT_PATH = "/Users/rachellekeblitis/The Garden";

// Recursively walk a directory and return paths to all .md files
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip hidden folders like .obsidian, .trash, .git
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      // Recurse into subfolders
      const nested = await findMarkdownFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

// Main entry point
async function main() {
  console.log(`Scanning vault: ${VAULT_PATH}\n`);

  const files = await findMarkdownFiles(VAULT_PATH);

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