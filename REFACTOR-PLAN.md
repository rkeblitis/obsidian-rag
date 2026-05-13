# Refactor plan (work in progress)

This document tracks a staged cleanup for the obsidian-rag v1 codebase: reduce duplication, make configuration explicit, and align retrieval behavior for both **gut-check / eval** and **production Q&A**.

You can stop after any step; early steps already remove a lot of duplication without changing behavior.

---

## Current duplication (snapshot)

| Piece | Where it appears |
|--------|------------------|
| `EmbeddedChunk` (same shape) | `ask.ts`, `query.ts`, `eval.ts` |
| `cosineSimilarity` | `ask.ts`, `query.ts`, `eval.ts` |
| `embed()` → Ollama `nomic-embed-text` | `ask.ts`, `query.ts`, `eval.ts`, `embed-vault.ts`, `embed-test.ts` (error handling varies) |
| `findMarkdownFiles` + `loadVault` | `embed-vault.ts`, `load-vault.ts`, `chunk.ts` |
| `chunkNote` + chunk constants | `embed-vault.ts`, `chunk.ts` |
| Hardcoded `VAULT_PATH` | `embed-vault.ts`, `load-vault.ts`, `chunk.ts`, `list-notes.ts` |

---

## Repository privacy (GitHub)

The numbered refactor steps focus on code structure. **They do not by themselves stop personal paths or note-derived data from appearing on GitHub** unless you wire config and ignores deliberately.

- **Paths:** Prefer `VAULT_PATH` (and similar) from the environment or a **gitignored** local file (e.g. `.env`). Commit only an **`.env.example`** with placeholder names and no real usernames or folder names.
- **Generated / private artifacts:** Add `.gitignore` entries for things like `embeddings.json` (embeds are derived from your vault; file can be large), any future local DB, and `.env`.
- **Source code:** After moving to env-based config, remove hardcoded absolute paths from tracked files so history stays clean going forward.
- **Eval / docs:** Note titles in test cases are usually fine; avoid committing long excerpts of note bodies or screenshots with paths if you care about leakage.
- **If something was already pushed:** Removing it in a later commit does not erase git history; for sensitive paths you may need history rewriting (e.g. `git filter-repo`) — treat that as a separate, careful step.

Tie this to **step 1 (config)** and **step 6 (polish)** when you implement.

---

## Ordered steps

### 1. Single config

One place (environment variables with defaults, or a small `config.ts`) for:

- Vault path  
- Embeddings file path  
- Ollama base URL  
- Model names (embed + generate)  
- Default `topK`, similarity threshold  

Removes repeated hardcoded paths and constants.

### 2. Shared embedding + math

Extract:

- `embed()` (Ollama HTTP)  
- `cosineSimilarity()`  

into small modules (e.g. `src/lib/ollama/embed.ts`, `src/lib/similarity.ts` — exact paths up to you). All scripts import them; unify `response.ok` handling everywhere.

### 3. Shared types

One definition of `EmbeddedChunk` and related shapes (`Chunk`, `Note`, etc.) so types are not copy-pasted across CLI entrypoints.

### 4. Shared vault + chunking

Extract:

- `findMarkdownFiles`  
- `loadVault`  
- `chunkNote`  
- Chunk size / overlap constants  

`embed-vault.ts` and `chunk.ts` (and any other consumer) import the same implementation.

### 5. Unified retrieval API

One pipeline: load index → embed question → score → sort.

**Important:** separate **ranking** from **thresholding**:

- **Ranked retrieval / top‑K** — sort by similarity, take top K. Use for gut-checking vectors and for eval (e.g. recall@K: did the expected note appear in the top K?).  
- **Threshold** — optional filter *on top of* the ranked list for “what we trust enough to send to the LLM” in `ask`.

Expose something like:

- `ranked` (full sorted list or capped by `maxCandidates`), and/or  
- `topK` slice for callers  

Then:

- **Gut-check CLI (`query`)** — print top K with scores; label clearly whether rows are above/below threshold so copy matches data.  
- **Eval** — same top‑K behavior; threshold optional or reported separately.  
- **Ask** — apply threshold when building context for generation.

Fix `query.ts` if the UI says “N relevant chunks” but lists a different set (e.g. global top K including below-threshold rows). Either show the same list you call relevant, or label the section as “top K by score” and show threshold separately.

### 6. Project polish

- `package.json`: scripts (`ask`, `query`, `eval`, `embed`, etc.), description, optional `engines.node`  
- Remove or ignore scratch entrypoints (e.g. `hello.ts`) if unused  

### 7. Docs

Fill in `README.md`: Setup, Usage, Architecture to match the layout after steps 1–5. Add a separate architecture doc only if the README grows too long.

---

## Notes

- **Stopping point:** Step 1–2 alone is a small, safe win.  
- **Eval / gut-check:** Must keep top‑K inspection independent of threshold; see step 5.

When a step is done, consider ticking it below or linking the PR / commit.

- [ ] 1. Single config  
- [ ] 2. Shared embedding + math  
- [ ] 3. Shared types  
- [ ] 4. Shared vault + chunking  
- [ ] 5. Unified retrieval API (+ query labeling fix)  
- [ ] 6. Project polish  
- [ ] 7. Docs  
- [ ] 8. Repo privacy: env-based paths, `.gitignore`, no secrets in tracked files (see section above)  
