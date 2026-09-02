/**
 * Generates normalized 384-dimensional dense vector embeddings using local all-MiniLM-L6-v2.
 */
export declare class EmbeddingService {
    /**
     * Embeds a single piece of text.
     */
    static embed(text: string): Promise<number[]>;
    /**
     * Embeds multiple texts in batch.
     */
    static embedBatch(texts: string[]): Promise<number[][]>;
    /**
     * Computes cosine similarity between two normalized vectors.
     */
    static cosineSimilarity(vecA: number[], vecB: number[]): number;
}
