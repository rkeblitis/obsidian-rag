/** Unit tests for `cosineSimilarity`: known vectors with expected scores (no Ollama, no disk).*/
import assert from "node:assert/strict";
import test from "node:test";
import { cosineSimilarity } from "../../lib/similarity.js";

// Same vector: angle 0 → cosine 1
test("identical unit vectors have cosine 1", () => {
  const v = [1, 0, 0];
  assert.equal(cosineSimilarity(v, v), 1);
});

// Cosine ignores length; [3,4] and [6,8] point the same way
test("same direction different lengths still cosine 1", () => {
  assert.equal(cosineSimilarity([3, 4], [6, 8]), 1);
});

// Perpendicular in 2D → dot product 0 after normalization
test("orthogonal vectors have cosine 0", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

// Flipped direction → cosine -1
test("opposite direction has cosine -1", () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});
