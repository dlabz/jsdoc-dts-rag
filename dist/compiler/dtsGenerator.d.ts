export interface DtsResult {
    sourcePath: string;
    dtsPath: string;
    dtsContent: string;
    diagnostics: string[];
}
export interface DtsCompileOptions {
    rootDir?: string;
    outDir?: string;
}
/**
 * Compiles JSDoc-annotated JavaScript and TypeScript files into .d.ts declaration files.
 */
export declare class DtsGenerator {
    private rootDir;
    private outDir;
    constructor(options?: DtsCompileOptions);
    /**
     * Compiles one or more files into .d.ts declaration files.
     * @param filePaths List of file paths to compile (can be relative or absolute)
     * @returns Array of compilation results containing paths and emitted content
     */
    compile(filePaths: string[]): Promise<DtsResult[]>;
}
