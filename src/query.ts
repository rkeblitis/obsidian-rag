/**
 * Retrieval debug CLI: embed the question, rank all chunks by cosine similarity, print top matches (no LLM answer).
 * For debugging and learnings
 * Not imported elsewhere — run directly, e.g. `npx tsx src/query.ts "your question"`.
 *
 * Flags (optional):
 *   --peek N        Show top N chunks by score even if below threshold (good for "why wrong chunks?")
 *   --full, -f      Print full chunk text instead of a 150-char preview
 *   --top N         Max chunks to show in normal mode (default 5)
 *   --threshold T   Min cosine score, 0–1 (default 0.55)
 *   --help, -h      Print usage and exit
 */
import { parseArgs } from "node:util";
import { loadEmbeddedChunks } from "./lib/embeddings-index.js";
import { embedText } from "./lib/ollama/embed.js";
import { rankEmbeddedChunksByCosine } from "./lib/retrieve.js";

// Shape we hand to `query()` after flags are parsed and validated.
// Local to this CLI; not in lib/types.ts because nothing else uses it, will move later if needed.
type QueryOptions = {
  question: string;
  topK: number;
  threshold: number;
  fullText: boolean;
  /** If set, ignore threshold and show top N by score. */
  peek: number | null;
};

const USAGE = `
Usage: npx tsx src/query.ts [flags] "your question"

Examples:
  npx tsx src/query.ts "who is paul"
  npx tsx src/query.ts --peek 25 "who is paul"      # top 25 by score, ignore threshold
  npx tsx src/query.ts --full --peek 10 "..."       # full text for top 10
  npx tsx src/query.ts --threshold 0.35 --top 10 "..."
`;

/**
 * Read CLI flags + the positional question using Node's built-in parser.
 * `parseArgs` handles `--flag value`, `--flag=value`, and short flags (`-f`).
 * Numeric flags come in as strings; we cast and validate here.
 */
function readOptions(argv: string[]): QueryOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      peek:      { type: "string" },                       // optional, no default
      top:       { type: "string", default: "5" },
      threshold: { type: "string", default: "0.55" },
      full:      { type: "boolean", short: "f", default: false },
      help:      { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }

  // Anything not consumed by a flag becomes part of the question.
  // Fall back to a generic default so plain `npx tsx src/query.ts` still runs.
  const question = positionals.join(" ").trim() || "What is in my notes?";

  const topK = parsePositiveInt(values.top!, "--top");
  const threshold = parseUnitFloat(values.threshold!, "--threshold");
  const peek = values.peek === undefined ? null : parsePositiveInt(values.peek, "--peek");

  return { question, topK, threshold, fullText: values.full === true, peek };
}

function parsePositiveInt(raw: string, flag: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) throw new Error(`${flag} must be a positive integer (got "${raw}")`);
  return n;
}

function parseUnitFloat(raw: string, flag: string): number {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`${flag} must be a number between 0 and 1 (got "${raw}")`);
  return n;
}

/** One-line text preview unless --full was passed. */
function preview(text: string, fullText: boolean): string {
  if (fullText) return text;
  const oneLine = text.slice(0, 150).replace(/\n/g, " ");
  return `${oneLine}${text.length > 150 ? "…" : ""}`;
}

async function query(opts: QueryOptions): Promise<void> {
  const { question, topK, threshold, fullText, peek } = opts;
  console.log(`\nQuestion: "${question}"\n`);

  // Load the on-disk index (embeddings.json) and embed the question with the same model.
  const chunks = await loadEmbeddedChunks();
  const questionVector = await embedText(question);
  // Score every chunk by cosine similarity (higher = more semantically similar to the question).
  const ranked = rankEmbeddedChunksByCosine(questionVector, chunks);

  // --peek: skip the threshold and just show the top-N raw matches.
  // Useful when retrieval looks wrong: see what's beating the chunks you expected.
  if (peek !== null) {
    const slice = ranked.slice(0, peek);
    console.log(`Top ${slice.length} chunks by cosine score (--peek, threshold ignored):\n`);
    for (let i = 0; i < slice.length; i++) {
      const { chunk, score } = slice[i]!;
      const pass = score >= threshold ? "≥ threshold" : "below threshold";
      console.log(`${i + 1}. [${score.toFixed(3)}] ${pass} — ${chunk.noteTitle} (chunk ${chunk.chunkIndex})`);
      console.log(preview(chunk.text, fullText));
      console.log();
    }
    return;
  }

  // Normal mode: keep only chunks that pass the similarity threshold.
  const relevant = ranked.filter(r => r.score >= threshold);

  if (relevant.length === 0) {
    console.log(`No chunks scored above ${threshold}. The vault probably doesn't contain a good answer to this question.\n`);
    console.log(`(Top result was ${ranked[0]!.score.toFixed(3)} — too low to trust.)\n`);
    console.log(`Tip: run with --peek 20 "${question}" to see the best-scoring chunks anyway.\n`);
    return;
  }

  const topResults = relevant.slice(0, topK);

  // Display results
  console.log(`Threshold ${threshold}, showing top ${topResults.length} of ${relevant.length} passing chunks:\n`);
  for (let i = 0; i < topResults.length; i++) {
    const { chunk, score } = topResults[i]!;
    console.log(`${i + 1}. [${score.toFixed(3)}] ${chunk.noteTitle} (chunk ${chunk.chunkIndex})`);
    console.log(preview(chunk.text, fullText));
    console.log();
  }
}

// --- Run a question (pass argv + flags, or use generic default in readOptions) ---
const opts = readOptions(process.argv.slice(2));
query(opts).catch(console.error);
