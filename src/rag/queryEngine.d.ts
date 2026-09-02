import { VectorStore, SearchResult } from "./vectorStore.js";
export interface RagResponse {
    query: string;
    answer: string;
    results: SearchResult[];
    sources: {
        symbol?: string;
        filePath: string;
        artifactType: string;
        score: number;
    }[];
}
export declare class QueryEngine {
    private store;
    constructor(store: VectorStore);
    /**
     * Performs semantic retrieval and synthesizes an answer for the user's question.
     */
    ask(query: string, topK?: number): Promise<RagResponse>;
    private synthesizeAnswer;
}
