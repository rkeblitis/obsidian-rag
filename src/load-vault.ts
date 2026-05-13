import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireVaultPath } from "./config.js";

// A note = its path + its content
type Note = {
  path: string;
  content: string;
};

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const nested = await findMarkdownFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function loadVault(vaultPath: string): Promise<Note[]> {
  const filePaths = await findMarkdownFiles(vaultPath);
  const notes: Note[] = [];

  for (const path of filePaths) {
    const content = await readFile(path, "utf-8");

    // Skip empty or near-empty notes (less than 50 characters of actual content)
    if (content.trim().length < 50) {
      continue;
    }

    notes.push({ path, content });
  }

  return notes;
}

async function main() {
  const vaultPath = requireVaultPath();
  console.log("Loading vault (path from VAULT_PATH in .env)...\n");

  const notes = await loadVault(vaultPath);

  console.log(`Loaded ${notes.length} notes with real content\n`);

  // Show stats
  const totalChars = notes.reduce((sum, n) => sum + n.content.length, 0);
  const avgChars = Math.round(totalChars / notes.length);
  const longest = notes.reduce((max, n) => n.content.length > max.content.length ? n : max);
  const shortest = notes.reduce((min, n) => n.content.length < min.content.length ? n : min);

  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`Average note length: ${avgChars} chars`);
  console.log(`Longest note: ${longest.path.split("/").pop()} (${longest.content.length} chars)`);
  console.log(`Shortest note: ${shortest.path.split("/").pop()} (${shortest.content.length} chars)`);
}

main().catch(console.error);