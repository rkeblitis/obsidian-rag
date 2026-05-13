/**
 * Cosine similarity: how "pointing the same way" two embedding vectors are.
 * Same-length arrays only. Result is roughly between -1 and 1; higher means more alike
 * (1 = same direction, 0 = unrelated directions).
 *
 * Note to remember: This is being used to sort vault chunks by how close they are to your question embedding.
 * Cosine is basically "dot product after shrinking each vector to length 1," so a chunk's
 * embedding being numerically bigger does not by itself rank it higher.
 * If you ever switched to plain dot product instead, longer vectors could get unfairly
 * high scores, and numbers would not line up with cosine—so any cutoff like "only show
 * matches above 0.55" would need to be rethought, not copy-pasted.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magnitudeA += a[i]! * a[i]!;
    magnitudeB += b[i]! * b[i]!;
  }
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
