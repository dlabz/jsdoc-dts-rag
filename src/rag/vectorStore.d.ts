import { DocumentChunk } from "./chunker.js";
export interface VectorRecord extends DocumentChunk {
    embedding: number[];
    indexedAt: number;
}
export interface SearchResult {
    chunk: DocumentChunk;
    score: number;
}
export declare class VectorStore {
    private records;
    private cachePath;
    constructor(cachePath?: string);
    /**
     * Initializes store by loading existing persisted index if available.
     */
    init(): Promise<void>;
    /**
     * Upserts chunks for a given source file. Removes previous chunks from the same file.
     */
    upsertFileChunks(sourceFile: string, chunks: DocumentChunk[], onProgress?: (current: number, total: number) => void): Promise<void>;
    /**
     * Removes all indexed chunks belonging to a specific source file.
     */
    removeFile(sourceFile: string, persist?: boolean): Promise<number>;
    /**
     * Searches the vector store using hybrid dense cosine similarity + symbol match boosting.
     */
    search(query: string, topK?: number, options?: {
        artifactType?: "dts" | "markdown";
    }): Promise<SearchResult[]>;
    /**
     * Returns vector store summary statistics.
     */
    stats(): {
        totalChunks: number;
        filesIndexed: number;
        symbolsIndexed: number;
    };
    /**
     * Persists vector store records to JSON cache.
     */
    persist(): Promise<void>;
}
