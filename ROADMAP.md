# Roadmap and backlog

## Near-term (engineering)

- [x] Minimal **unit tests** (`cosineSimilarity`, `chunkNote`) via `npm test`.
- [ ] **Fixture smoke test** for `embeddings.json` shape (array of rows, uniform `embedding.length`) using a tiny checked-in or generated fixture.
- [ ] Optional **stricter retrieval test** with synthetic vectors and a fake index (no Ollama).

## Product / research (RAG behavior)

- [ ] **Meta questions:** richer corpus context (beyond `VAULT_OVERVIEW_FILE`), optional second-stage "summarize the index" or small structured stats injected into prompts. Pick one approach and document it in `Decision-log.md`.
- [ ] **Eval set hygiene:** versioned questions + expected titles; optional export of scores for threshold tuning.
- [ ] **Stronger generation:** larger local model or hosted API (separate decision: privacy vs quality).

## Toward agents and "it figures out the prompt" (practical order)

- [ ] **Small API:** expose vault search (and optionally ask) as callable functions or endpoints so agents are not tied to one fixed CLI template.
- [ ] **Tool loop:** support repeated search / read (and maybe search again), not only single-turn retrieve then generate.
- [ ] **Plan before act:** optional router or planner step so intent and search queries pick the right prompt template instead of one hard-coded block.

### 1. Turn retrieval into a stable **tool** (foundation)

- Extract a function like `searchVaultNotes(query: string, opts?)` that returns ranked chunks (what `query.ts` does today, without `console.log`).
- Same inputs/outputs whether a human CLI or an agent calls it.

### 2. **Agent** = loop with tool calls (not one shot)

- **Today:** `ask.ts` does one embed, one rank, one big prompt, one stream. That is "single-turn RAG."
- **Agent-shaped:** model decides "I need more context" and calls `searchVaultNotes` again with a refined query, or calls a second tool (e.g. `getNoteOutline`), up to `maxSteps`. Ollama supports tool-style JSON in newer flows; if not, you can still fake a loop in code: parse model output for `TOOL: search(...)` or use structured JSON from a first call.
- Start with **2 steps max** in your own script before buying a full agent framework.

### 3. **"Figure out the prompt"** = a thin **router** step

- Before retrieval, run a **small structured step**: model outputs JSON like `{ "intent": "factual" | "meta" | "compare", "search_queries": ["..."], "need_overview": true/false }`.
- Your code then chooses which **template** to use (retrieve + answer vs overview-heavy vs multi-query retrieve). The model is not rewriting the whole system prompt from scratch; it is **routing** and **query rewriting**, which is how many production systems stay controllable.
- **Query rewriting** alone (expand one user line into 2 to 3 search strings, embed each, merge chunk scores) is a strong 2026 baseline upgrade with little architecture change.

### 4. **MCP (Model Context Protocol)** for Cursor / other hosts

- Expose `searchVaultNotes` (and optionally `askVault`) as **MCP tools** so an IDE agent can query your vault without pasting files. Keeps `VAULT_PATH` and index on your machine; the agent only sees tool results you define.
- Fits "agents" in the sense people mean in 2026: external orchestrator plus your vault as a tool server.

## Tooling ("agents")

- [ ] **Cursor / IDE agents:** rules or skills so agents respect `VAULT_PATH`, never commit `embeddings.json`, respect `.env`, and run `npm test` after refactors (repo-specific workflow; lives in `.cursor/` if you add it).

---

## Current state (snapshot)

Rough picture of what was true when this section was last refreshed; treat the **checklists above** as the source of truth for what is next.

- Full RAG path works locally: vault → chunk → Ollama embeddings → cosine retrieval → threshold → `ask.ts` streams an answer with sources.
- Paths and models come from `.env` / `src/config.ts`.
- Shared ranking lives in `src/lib/retrieve.ts`; `npm test` covers `src/tests/unit/`.

## Session notes

Short narrative for future you (or a reviewer).

- Early exploration lived in small CLIs under `src/` (`list-notes`, `load-vault`, `chunk`, `embed-vault`, `query`, `ask`); embed sanity check is `src/tests/embed-test.ts`.
- **Headlines learned:** embeddings behave like direction in high-D space (cosine compares direction); chunking is a real product knob; fixed similarity thresholds are model- and corpus-specific; corpus-level "meta" questions need explicit context (overview text, stats, or a second retrieval strategy); unit tests guard code, eval scripts guard *your* retrieval quality, different jobs.
