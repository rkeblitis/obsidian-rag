# Roadmap and backlog

## Near-term (engineering)

- [x] Minimal **unit tests** (`cosineSimilarity`, `chunkNote`) via `npm test`.
- [ ] **Fixture smoke test** for `embeddings.json` shape (array of rows, uniform `embedding.length`) using a tiny checked-in or generated fixture.
- [ ] Optional **stricter retrieval test** with synthetic vectors and a fake index (no Ollama).

## Product / research (RAG behavior)

- [ ] **Meta questions:** richer corpus context (beyond `VAULT_OVERVIEW_FILE`), optional second-stage “summarize the index” or small structured stats injected into prompts — pick one approach and document it in `Decision-log.md`.
- [ ] **Eval set hygiene:** versioned questions + expected titles; optional export of scores for threshold tuning.
- [ ] **Stronger generation:** larger local model or hosted API — separate decision (privacy vs quality).

## Tooling (“agents”)

- [ ] **Cursor / IDE agents:** rules or skills so agents respect `VAULT_PATH`, never commit `embeddings.json`, and run `npm test` after refactors (repo-specific workflow — lives in `.cursor/` if you add it).

---

## Current state (snapshot)

Rough picture of what was true when this section was last refreshed; treat the **checklists above** as the source of truth for “what’s next.”

- Full RAG path works locally: vault → chunk → Ollama embeddings → cosine retrieval → threshold → `ask.ts` streams an answer with sources.
- Paths and models come from `.env` / `src/config.ts`.
- Shared ranking lives in `src/lib/retrieve.ts`; `npm test` covers `src/tests/unit/`.

## Session notes

Short narrative for future me (or a reviewer) 

- Early exploration lived in small CLIs under `src/` (`list-notes`, `load-vault`, `chunk`, `embed-vault`, `query`, `ask`); embed sanity check is `src/tests/embed-test.ts`.
- **Headlines learned:** embeddings behave like direction in high-D space (cosine compares direction); chunking is a real product knob; fixed similarity thresholds are model- and corpus-specific; corpus-level “meta” questions need explicit context (overview text, stats, or a second retrieval strategy); unit tests guard code, eval scripts guard *your* retrieval quality — different jobs.
