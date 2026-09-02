import { VectorStore } from "./rag/vectorStore.js";
import { AstGraphGenerator, AstGraphData } from "./compiler/astGraphGenerator.js";
export interface PipelineOptions {
    srcDir?: string;
    typesDir?: string;
    docsDir?: string;
    graphDir?: string;
    cacheDir?: string;
}
export declare class SyncPipeline {
    private srcDir;
    private typesDir;
    private docsDir;
    private graphDir;
    private dtsGen;
    private mdGen;
    astGraphGen: AstGraphGenerator;
    store: VectorStore;
    currentGraph: AstGraphData | null;
    constructor(options?: PipelineOptions);
    /**
     * Initializes the pipeline and vector store.
     */
    init(): Promise<void>;
    /**
     * Finds all JavaScript and TypeScript source files in the source directory.
     */
    findSourceFiles(): Promise<string[]>;
    /**
     * Runs the full pipeline across all source files.
     */
    syncAll(): Promise<{
        filesProcessed: number;
        dtsCount: number;
        mdCount: number;
        totalChunks: number;
    }>;
    /**
     * Incrementally processes a single changed or added file.
     */
    syncFile(filePath: string): Promise<void>;
    /**
     * Handles deletion of a source file.
     */
    removeFile(filePath: string): Promise<void>;
}
