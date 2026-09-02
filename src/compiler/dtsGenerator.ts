import ts from "typescript";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

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
export class DtsGenerator {
  private rootDir: string;
  private outDir: string;

  constructor(options: DtsCompileOptions = {}) {
    this.rootDir = path.resolve(options.rootDir || "src");
    this.outDir = path.resolve(options.outDir || "dist/types");
  }

  /**
   * Compiles one or more files into .d.ts declaration files.
   * @param filePaths List of file paths to compile (can be relative or absolute)
   * @returns Array of compilation results containing paths and emitted content
   */
  public async compile(filePaths: string[]): Promise<DtsResult[]> {
    if (filePaths.length === 0) {
      return [];
    }

    const resolvedFilePaths = filePaths.map((f) => path.resolve(f));
    await fs.mkdir(this.outDir, { recursive: true });

    const options: ts.CompilerOptions = {
      allowJs: true,
      checkJs: true,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: this.outDir,
      rootDir: this.rootDir,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
    };

    const host = ts.createCompilerHost(options);
    const emittedFiles = new Map<string, string>();

    // Intercept writeFile to capture the emitted .d.ts files in memory as well
    const originalWriteFile = host.writeFile;
    host.writeFile = (fileName, text, writeByteOrderMark, onError, sourceFiles) => {
      emittedFiles.set(path.resolve(fileName), text);
      originalWriteFile(fileName, text, writeByteOrderMark, onError, sourceFiles);
    };

    const program = ts.createProgram(resolvedFilePaths, options, host);
    const emitResult = program.emit();

    const allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    const diagnosticMessages: string[] = [];
    for (const diagnostic of allDiagnostics) {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
          diagnostic.file,
          diagnostic.start!
        );
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );
        diagnosticMessages.push(
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        );
      } else {
        diagnosticMessages.push(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        );
      }
    }

    const results: DtsResult[] = [];

    for (const sourcePath of resolvedFilePaths) {
      const relPath = path.relative(this.rootDir, sourcePath);
      const parsed = path.parse(relPath);
      // Expected .d.ts name
      const expectedDtsRelPath = path.join(
        parsed.dir,
        `${parsed.name}.d.ts`
      );
      const expectedDtsPath = path.resolve(this.outDir, expectedDtsRelPath);

      let dtsContent = emittedFiles.get(expectedDtsPath);
      if (!dtsContent && existsSync(expectedDtsPath)) {
        dtsContent = await fs.readFile(expectedDtsPath, "utf-8");
      }

      if (dtsContent) {
        results.push({
          sourcePath,
          dtsPath: expectedDtsPath,
          dtsContent,
          diagnostics: diagnosticMessages.filter((m) => m.includes(sourcePath)),
        });
      }
    }

    return results;
  }
}
