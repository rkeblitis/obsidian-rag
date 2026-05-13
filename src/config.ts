import dotenv from "dotenv";
import { isAbsolute, resolve } from "node:path";
import { readFile } from "node:fs/promises";

dotenv.config();

const DEFAULT_VAULT_OVERVIEW = `These excerpts are from the user's private Obsidian vault. Use retrieved passages as the primary factual source, and cite sources by the note titles shown in each block. If the passages do not support an answer, say so.`;

export function requireVaultPath(): string {
  const v = process.env["VAULT_PATH"]?.trim();
  if (!v) {
    throw new Error(
      "Missing VAULT_PATH. Copy .env.example to .env and set VAULT_PATH to your Obsidian vault root (the folder that contains your notes).",
    );
  }
  return v;
}

export function embeddingsFilePath(): string {
  return process.env["EMBEDDINGS_FILE"]?.trim() || "embeddings.json";
}

export function ollamaBaseUrl(): string {
  const raw = process.env["OLLAMA_BASE_URL"]?.trim() || "http://localhost:11434";
  return raw.replace(/\/$/, "");
}

/** Resolve a path from env or CLI: absolute paths unchanged, else relative to cwd. */
export function resolveUserPath(pathish: string): string {
  return isAbsolute(pathish) ? pathish : resolve(process.cwd(), pathish);
}

/** Resolve `embeddingsFilePath()` against cwd (absolute env paths unchanged). */
export function resolvedEmbeddingsFilePath(): string {
  return resolveUserPath(embeddingsFilePath());
}

function vaultOverviewFileFromEnv(): string | undefined {
  const p = process.env["VAULT_OVERVIEW_FILE"]?.trim();
  return p || undefined;
}

/** Optional richer vault blurb for the LLM; keep the file gitignored if it names topics or counts. */
export async function loadVaultOverviewForPrompt(): Promise<string> {
  const file = vaultOverviewFileFromEnv();
  if (!file) return DEFAULT_VAULT_OVERVIEW;
  const abs = resolveUserPath(file);
  const text = (await readFile(abs, "utf-8")).trim();
  return text.length > 0 ? text : DEFAULT_VAULT_OVERVIEW;
}
