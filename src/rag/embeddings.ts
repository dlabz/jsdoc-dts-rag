let pipelinePromise: Promise<any> | null = null;

async function getExtractor() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // Dynamic import to support smooth ESM loading
      const { pipeline, env } = await import("@xenova/transformers");
      // Allow local model caching in .rag_cache/models or system cache
      env.cacheDir = "./.rag_cache/models";
      return await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    })();
  }
  return pipelinePromise;
}

/**
 * Generates normalized 384-dimensional dense vector embeddings using local all-MiniLM-L6-v2.
 */
export class EmbeddingService {
  /**
   * Embeds a single piece of text.
   */
  public static async embed(text: string): Promise<number[]> {
    const extractor = await getExtractor();
    // Clean and truncate text if very long to fit transformer context window
    const cleanedText = text.replace(/\s+/g, " ").trim().slice(0, 2048);
    const output = await extractor(cleanedText, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data);
  }

  /**
   * Embeds multiple texts in batch.
   */
  public static async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  /**
   * Computes cosine similarity between two normalized vectors.
   */
  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return dot;
  }
}
