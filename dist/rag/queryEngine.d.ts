import { VectorStore, SearchResult } from "./vectorStore.js";
import { AstGraphData } from "../compiler/astGraphGenerator.js";
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
    graphNeighbors?: {
        symbol: string;
        relation: string;
        connectedSymbol: string;
    }[];
}
export declare class QueryEngine {
    private store;
    private graph;
    constructor(store: VectorStore, graph?: AstGraphData | null);
    loadGraph(graphPath?: string): Promise<void>;
    /**
     * Performs semantic retrieval and synthesizes an answer for the user's question.
     */
    ask(query: string, topK?: number): Promise<RagResponse>;
    private synthesizeAnswer;
}
