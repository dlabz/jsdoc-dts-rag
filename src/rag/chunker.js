import crypto from "node:crypto";
/**
 * Chunker specifically tailored for TypeScript declarations (.d.ts) and Markdown API docs.
 */
export class SemanticChunker {
    /**
     * Chunks a .d.ts declaration file into symbol-level chunks.
     */
    static chunkDts(dtsContent, sourceFile, dtsPath) {
        const chunks = [];
        const lines = dtsContent.split("\n");
        // Also include a full module overview chunk if dts is reasonably small
        if (dtsContent.trim().length > 0) {
            chunks.push({
                id: this.generateChunkId(dtsPath, "module-overview"),
                sourceFile,
                artifactType: "dts",
                title: `Type Declarations Overview for ${sourceFile}`,
                content: `Declaration file: ${dtsPath}\nSource file: ${sourceFile}\n\n\`\`\`typescript\n${dtsContent.slice(0, 1500)}\n\`\`\``,
                metadata: {
                    filePath: dtsPath,
                    kind: "DeclarationModule",
                },
            });
        }
        // Split declarations by top-level export/declare blocks
        let currentBlock = [];
        let currentSymbol = "";
        let currentKind = "";
        let startLine = 1;
        let braceDepth = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // Track open and close braces
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            if (currentBlock.length === 0) {
                startLine = i + 1;
                // Check for symbol headers
                const match = trimmed.match(/^(?:export\s+|declare\s+)*(?:(?:async\s+)?function|class|interface|type|const|let|var)\s+([a-zA-Z0-9_$]+)/);
                if (match) {
                    currentSymbol = match[1];
                    if (trimmed.includes("function"))
                        currentKind = "Function";
                    else if (trimmed.includes("class"))
                        currentKind = "Class";
                    else if (trimmed.includes("interface"))
                        currentKind = "Interface";
                    else if (trimmed.includes("type"))
                        currentKind = "Type";
                    else
                        currentKind = "Variable";
                }
            }
            currentBlock.push(line);
            braceDepth += openBraces - closeBraces;
            // End of block: brace depth returns to 0 and either line ends with semicolon or closing brace
            const isEndOfStatement = braceDepth <= 0 &&
                (trimmed.endsWith(";") ||
                    trimmed.endsWith("}") ||
                    trimmed.length === 0);
            if (isEndOfStatement && currentBlock.length > 0 && currentSymbol) {
                const chunkContent = currentBlock.join("\n").trim();
                if (chunkContent.length > 0) {
                    chunks.push({
                        id: this.generateChunkId(dtsPath, `${currentSymbol}-${startLine}`),
                        sourceFile,
                        artifactType: "dts",
                        symbolName: currentSymbol,
                        title: `TypeScript Declaration: ${currentSymbol} (${currentKind})`,
                        content: `// Source: ${sourceFile}\n// Declaration: ${dtsPath} (lines ${startLine}-${i + 1})\n\`\`\`typescript\n${chunkContent}\n\`\`\``,
                        metadata: {
                            filePath: dtsPath,
                            lineStart: startLine,
                            lineEnd: i + 1,
                            kind: currentKind,
                            symbol: currentSymbol,
                        },
                    });
                }
                currentBlock = [];
                currentSymbol = "";
                currentKind = "";
                braceDepth = 0;
            }
        }
        return chunks;
    }
    /**
     * Chunks a Markdown documentation file into section/symbol chunks.
     */
    static chunkMarkdown(markdownContent, sourceFile, markdownPath) {
        const chunks = [];
        const sections = markdownContent.split(/\n(?=### `[^`]+`)/g);
        // Frontmatter & Overview chunk
        if (sections.length > 0 && !sections[0].startsWith("### `")) {
            const overviewContent = sections[0].trim();
            if (overviewContent.length > 0) {
                chunks.push({
                    id: this.generateChunkId(markdownPath, "doc-overview"),
                    sourceFile,
                    artifactType: "markdown",
                    title: `Documentation Overview for ${sourceFile}`,
                    content: overviewContent,
                    metadata: {
                        filePath: markdownPath,
                        kind: "DocumentOverview",
                    },
                });
            }
        }
        // Individual symbol documentation sections
        for (let idx = 0; idx < sections.length; idx++) {
            const sec = sections[idx].trim();
            if (!sec.startsWith("### `"))
                continue;
            const symbolMatch = sec.match(/^### `([^`]+)`/);
            const symbolName = symbolMatch ? symbolMatch[1] : `symbol-${idx}`;
            const kindMatch = sec.match(/\*Kind\*:\s*\*\*([^*]+)\*\*/);
            const kind = kindMatch ? kindMatch[1] : "Symbol";
            chunks.push({
                id: this.generateChunkId(markdownPath, `symbol-${symbolName}`),
                sourceFile,
                artifactType: "markdown",
                symbolName,
                title: `API Documentation for ${symbolName} (${kind})`,
                content: `Document: ${markdownPath}\nSource: ${sourceFile}\n\n${sec}`,
                metadata: {
                    filePath: markdownPath,
                    kind,
                    symbol: symbolName,
                },
            });
        }
        return chunks;
    }
    static generateChunkId(filePath, differentiator) {
        return crypto
            .createHash("sha256")
            .update(`${filePath}::${differentiator}`)
            .digest("hex")
            .slice(0, 16);
    }
}
