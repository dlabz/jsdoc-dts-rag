export interface MarkdownResult {
    sourcePath: string;
    markdownPath: string;
    markdownContent: string;
    symbolCount: number;
}
export interface MarkdownOptions {
    rootDir?: string;
    outDir?: string;
}
/**
 * Generates rich, RAG-optimized Markdown documentation from TypeScript / JSDoc source files.
 */
export declare class MarkdownGenerator {
    private rootDir;
    private outDir;
    constructor(options?: MarkdownOptions);
    /**
     * Generates markdown documentation files from a list of source or declaration files.
     * @param filePaths Source or declaration files to parse
     * @returns Generated markdown details
     */
    generate(filePaths: string[]): Promise<MarkdownResult[]>;
    private extractStatementDoc;
    private extractFunctionDoc;
    private extractClassDoc;
    private extractInterfaceDoc;
    private extractTypeAliasDoc;
    private extractVariableDoc;
    private extractTypedefsFromNode;
    private parseJsDoc;
    private formatMarkdown;
}
