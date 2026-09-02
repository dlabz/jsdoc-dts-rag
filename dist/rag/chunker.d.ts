export interface DocumentChunk {
    id: string;
    sourceFile: string;
    artifactType: "dts" | "markdown" | "source";
    symbolName?: string;
    title: string;
    content: string;
    metadata: {
        filePath: string;
        lineStart?: number;
        lineEnd?: number;
        kind?: string;
        module?: string;
        [key: string]: any;
    };
}
/**
 * Chunker specifically tailored for TypeScript declarations (.d.ts) and Markdown API docs.
 */
export declare class SemanticChunker {
    /**
     * Chunks a .d.ts declaration file into symbol-level chunks.
     */
    static chunkDts(dtsContent: string, sourceFile: string, dtsPath: string): DocumentChunk[];
    /**
     * Chunks a Markdown documentation file into section/symbol chunks.
     */
    static chunkMarkdown(markdownContent: string, sourceFile: string, markdownPath: string): DocumentChunk[];
    private static generateChunkId;
}
