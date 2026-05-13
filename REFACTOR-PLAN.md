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
