export interface AstGraphNode {
    id: string;
    name: string;
    kind: "Function" | "Class" | "Method" | "Interface" | "TypeAlias" | "Variable" | "Module";
    filePath: string;
    signature?: string;
    description?: string;
}
export interface AstGraphEdge {
    source: string;
    target: string;
    relation: "references_type" | "returns_type" | "parameter_type" | "extends" | "implements" | "member_of";
}
export interface AstGraphData {
    nodes: AstGraphNode[];
    edges: AstGraphEdge[];
    generatedAt: number;
}
export interface AstGraphOptions {
    outDir?: string;
}
/**
 * Parses .d.ts files and constructs a symbol relationship & dependency AST graph.
 */
export declare class AstGraphGenerator {
    private outDir;
    constructor(options?: AstGraphOptions);
    /**
     * Generates AST graph from given .d.ts files.
     */
    generateFromDts(dtsFiles: string[]): Promise<AstGraphData>;
    private collectSymbols;
    private extractEdges;
    private findReferencedTypeNames;
    /**
     * Persists graph data to JSON and Mermaid flowchart diagrams.
     */
    persist(graph: AstGraphData): Promise<{
        jsonPath: string;
        mermaidPath: string;
    }>;
    /**
     * Converts graph data into a clean Mermaid flowchart diagram.
     */
    formatMermaid(graph: AstGraphData): string;
}
