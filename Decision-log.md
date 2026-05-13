# Decisions

## 2026-05-12

- **TypeScript over Python.** Need TS for interviews; toolchain pain was real
  but cleared by mid-day.
- **Ollama for embeddings + LLM.** No API keys to manage, free experimentation,
  privacy for personal notes. Tradeoff: lower answer quality than Claude.
- **Chunk size 1000 chars, overlap 100.** Picked based on `nomic-embed-text`
  context window (~512 tokens), not based on data. Boundary-aware splitting
  added because pure size-based produced mid-word cuts.
- **Cosine similarity threshold 0.55.** Working queries scored 0.7+, failing
  queries topped out at 0.46. 0.55 cleanly separates them.
- **JSON file for storage instead of a vector DB.** Vault is small (171 chunks);
  loading and comparing in memory is fast enough. Adding a vector DB would be
  complexity without value at this scale.
- **No eval set yet.** Deliberately deferred to ship v1. Plan to add before any
  serious tuning.