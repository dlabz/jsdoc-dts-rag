import ts from "typescript";
import path from "node:path";
import fs from "node:fs/promises";

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

interface ParamDoc {
  name: string;
  type: string;
  description: string;
  isOptional: boolean;
}

interface SymbolDoc {
  name: string;
  kind: string;
  signature: string;
  description: string;
  params: ParamDoc[];
  returns: { type: string; description: string };
  examples: string[];
  deprecated?: string;
  seeAlso?: string[];
}

/**
 * Generates rich, RAG-optimized Markdown documentation from TypeScript / JSDoc source files.
 */
export class MarkdownGenerator {
  private rootDir: string;
  private outDir: string;

  constructor(options: MarkdownOptions = {}) {
    this.rootDir = path.resolve(options.rootDir || "src");
    this.outDir = path.resolve(options.outDir || "dist/docs");
  }

  /**
   * Generates markdown documentation files from a list of source or declaration files.
   * @param filePaths Source or declaration files to parse
   * @returns Generated markdown details
   */
  public async generate(filePaths: string[]): Promise<MarkdownResult[]> {
    if (filePaths.length === 0) {
      return [];
    }

    const resolvedFilePaths = filePaths.map((f) => path.resolve(f));
    await fs.mkdir(this.outDir, { recursive: true });

    const program = ts.createProgram(resolvedFilePaths, {
      allowJs: true,
      checkJs: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
    });

    const checker = program.getTypeChecker();
    const results: MarkdownResult[] = [];

    for (const sourcePath of resolvedFilePaths) {
      const sourceFile = program.getSourceFile(sourcePath);
      if (!sourceFile) continue;

      const symbols: SymbolDoc[] = [];
      let fileOverview = "";

      // Check leading comments for fileoverview / module docs
      const fullText = sourceFile.getFullText();
      const leadingCommentRanges = ts.getLeadingCommentRanges(fullText, 0);
      if (leadingCommentRanges && leadingCommentRanges.length > 0) {
        const comment = fullText.substring(
          leadingCommentRanges[0].pos,
          leadingCommentRanges[0].end
        );
        fileOverview = comment
          .replace(/^\/\*\*?|\*\/$/g, "")
          .split("\n")
          .map((line) => line.replace(/^\s*\* ?/, "").trim())
          .filter((line) => !line.startsWith("@"))
          .join(" ")
          .trim();
      }

      // Traverse top-level statements
      for (const statement of sourceFile.statements) {
        // First check for any @typedefs attached to this statement
        const typedefDocs = this.extractTypedefsFromNode(statement, sourceFile);
        symbols.push(...typedefDocs);

        const doc = this.extractStatementDoc(statement, sourceFile, checker);
        if (doc) {
          symbols.push(doc);
        }
      }

      const relPath = path.relative(this.rootDir, sourcePath);
      const parsed = path.parse(relPath);
      const mdRelPath = path.join(parsed.dir, `${parsed.name}.md`);
      const mdPath = path.resolve(this.outDir, mdRelPath);

      const markdownContent = this.formatMarkdown(
        parsed.name,
        relPath,
        fileOverview,
        symbols
      );

      await fs.mkdir(path.dirname(mdPath), { recursive: true });
      await fs.writeFile(mdPath, markdownContent, "utf-8");

      results.push({
        sourcePath,
        markdownPath: mdPath,
        markdownContent,
        symbolCount: symbols.length,
      });
    }

    return results;
  }

  private extractStatementDoc(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): SymbolDoc | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return this.extractFunctionDoc(node, sourceFile, checker);
    } else if (ts.isClassDeclaration(node) && node.name) {
      return this.extractClassDoc(node, sourceFile, checker);
    } else if (ts.isInterfaceDeclaration(node)) {
      return this.extractInterfaceDoc(node, sourceFile, checker);
    } else if (ts.isTypeAliasDeclaration(node)) {
      return this.extractTypeAliasDoc(node, sourceFile, checker);
    } else if (ts.isVariableStatement(node)) {
      // Check variable declarations (e.g., arrow functions or exported constants)
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          return this.extractVariableDoc(decl, node, sourceFile, checker);
        }
      }
    }
    return null;
  }

  private extractFunctionDoc(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): SymbolDoc {
    const name = node.name?.getText(sourceFile) || "anonymous";
    const signature = node.getText(sourceFile).split(/\{|\;/)[0].trim();
    const { description, params, returns, examples, deprecated, seeAlso } =
      this.parseJsDoc(node, sourceFile);

    return {
      name,
      kind: "Function",
      signature,
      description,
      params,
      returns,
      examples,
      deprecated,
      seeAlso,
    };
  }

  private extractClassDoc(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): SymbolDoc {
    const name = node.name?.getText(sourceFile) || "AnonymousClass";
    const signature = `class ${name}`;
    const { description, params, returns, examples, deprecated, seeAlso } =
      this.parseJsDoc(node, sourceFile);

    // Collect methods
    const methodDocs: string[] = [];
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const methodName = member.name.getText(sourceFile);
        const methodSig = member.getText(sourceFile).split(/\{|\;/)[0].trim();
        const memberJsDoc = this.parseJsDoc(member, sourceFile);
        methodDocs.push(`- **\`${methodName}\`**: \`${methodSig}\`\n  ${memberJsDoc.description}`);
      }
    }

    let classDesc = description;
    if (methodDocs.length > 0) {
      classDesc += `\n\n#### Methods\n${methodDocs.join("\n")}`;
    }

    return {
      name,
      kind: "Class",
      signature,
      description: classDesc,
      params,
      returns,
      examples,
      deprecated,
      seeAlso,
    };
  }

  private extractInterfaceDoc(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): SymbolDoc {
    const name = node.name.getText(sourceFile);
    const signature = node.getText(sourceFile).split(/\{/)[0].trim() + " { ... }";
    const { description, params, returns, examples, deprecated, seeAlso } =
      this.parseJsDoc(node, sourceFile);

    // List properties
    const props: string[] = [];
    for (const member of node.members) {
      props.push(`- \`${member.getText(sourceFile).trim()}\``);
    }

    let fullDesc = description;
    if (props.length > 0) {
      fullDesc += `\n\n#### Properties\n${props.join("\n")}`;
    }

    return {
      name,
      kind: "Interface",
      signature,
      description: fullDesc,
      params,
      returns,
      examples,
      deprecated,
      seeAlso,
    };
  }

  private extractTypeAliasDoc(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): SymbolDoc {
    const name = node.name.getText(sourceFile);
    const signature = node.getText(sourceFile).trim();
    const { description, params, returns, examples, deprecated, seeAlso } =
      this.parseJsDoc(node, sourceFile);

    return {
      name,
      kind: "TypeAlias",
      signature,
      description,
      params,
      returns,
      examples,
      deprecated,
      seeAlso,
    };
  }

  private extractVariableDoc(
    decl: ts.VariableDeclaration,
    statement: ts.VariableStatement,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): SymbolDoc {
    const name = decl.name.getText(sourceFile);
    const isArrow = decl.initializer && ts.isArrowFunction(decl.initializer);
    const kind = isArrow ? "Function" : "Variable";
    const signature = decl.getText(sourceFile).split(/=>|\=/)[0].trim();
    const { description, params, returns, examples, deprecated, seeAlso } =
      this.parseJsDoc(statement, sourceFile);

    return {
      name,
      kind,
      signature,
      description,
      params,
      returns,
      examples,
      deprecated,
      seeAlso,
    };
  }

  private extractTypedefsFromNode(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): SymbolDoc[] {
    const results: SymbolDoc[] = [];
    // @ts-ignore
    const jsDocNodes = node.jsDoc as ts.JSDoc[] | undefined;
    if (!jsDocNodes) return results;

    for (const doc of jsDocNodes) {
      const tags = doc.tags || [];
      const typedefTag = tags.find((t) => t.tagName.getText(sourceFile) === "typedef");
      if (typedefTag) {
        // Found a @typedef!
        const tagText = typedefTag.getText(sourceFile);
        const match = tagText.match(/@typedef\s*(?:\{([^}]+)\})?\s*([a-zA-Z0-9_$]+)?/);
        const typeExpr = match && match[1] ? match[1].trim() : "Object";
        // @ts-ignore
        const typeName = (typedefTag.name ? typedefTag.name.getText(sourceFile) : (match && match[2] ? match[2] : "AnonymousType"));
        
        let commentText = "";
        if (typeof doc.comment === "string") {
          commentText = doc.comment.trim();
        } else if (Array.isArray(doc.comment)) {
          commentText = doc.comment.map((c: any) => c.text).join("").trim();
        }

        const props: ParamDoc[] = [];
        for (const t of tags) {
          if (t.tagName.getText(sourceFile) === "property" || t.tagName.getText(sourceFile) === "prop") {
            const propTag = t as ts.JSDocPropertyLikeTag;
            const pName = propTag.name ? propTag.name.getText(sourceFile) : "prop";
            const pType = propTag.typeExpression ? propTag.typeExpression.type.getText(sourceFile) : "any";
            const pComment = typeof propTag.comment === "string" ? propTag.comment : "";
            props.push({
              name: pName,
              type: pType,
              description: pComment.trim(),
              isOptional: propTag.isBracketed || false,
            });
          }
        }

        let desc = commentText;
        if (props.length > 0) {
          desc += `\n\n#### Properties\n| Property | Type | Description |\n| :--- | :--- | :--- |\n` +
            props.map(p => `| \`${p.name}\` | \`${p.type}\` | ${p.description || "-"} |`).join("\n");
        }

        results.push({
          name: typeName,
          kind: "TypeDef",
          signature: `type ${typeName} = ${typeExpr}`,
          description: desc,
          params: props,
          returns: { type: "void", description: "" },
          examples: [],
        });
      }
    }

    return results;
  }

  private parseJsDoc(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): {
    description: string;
    params: ParamDoc[];
    returns: { type: string; description: string };
    examples: string[];
    deprecated?: string;
    seeAlso?: string[];
  } {
    let description = "";
    const params: ParamDoc[] = [];
    let returns = { type: "void", description: "" };
    const examples: string[] = [];
    let deprecated: string | undefined;
    const seeAlso: string[] = [];

    // @ts-ignore - jsDoc property exists on nodes with comments in TS AST
    const jsDocNodes = node.jsDoc as ts.JSDoc[] | undefined;
    if (jsDocNodes && jsDocNodes.length > 0) {
      // Find the JSDoc node directly describing this statement (usually the last one that is not @typedef / @module)
      let targetDoc = jsDocNodes[jsDocNodes.length - 1];
      for (let i = jsDocNodes.length - 1; i >= 0; i--) {
        const d = jsDocNodes[i];
        const hasTypedef = (d.tags || []).some(
          (t) => t.tagName.getText(sourceFile) === "typedef" || t.tagName.getText(sourceFile) === "fileoverview"
        );
        if (!hasTypedef) {
          targetDoc = d;
          break;
        }
      }

      const mainComment = targetDoc.comment;
      if (typeof mainComment === "string") {
        description = mainComment.trim();
      } else if (Array.isArray(mainComment)) {
        description = mainComment.map((c) => c.text).join("").trim();
      }
    }

    const jsDocTags = ts.getJSDocTags(node);

    for (const tag of jsDocTags) {
      const tagName = tag.tagName.getText(sourceFile);
      const comment = typeof tag.comment === "string"
        ? tag.comment
        : Array.isArray(tag.comment)
        ? tag.comment.map((c) => c.text).join("")
        : "";

      if (tagName === "param") {
        const paramTag = tag as ts.JSDocParameterTag;
        const paramName = paramTag.name ? paramTag.name.getText(sourceFile) : "param";
        const paramType = paramTag.typeExpression
          ? paramTag.typeExpression.type.getText(sourceFile)
          : "any";
        params.push({
          name: paramName,
          type: paramType,
          description: comment.trim(),
          isOptional: paramTag.isBracketed || false,
        });
      } else if (tagName === "returns" || tagName === "return") {
        const returnTag = tag as ts.JSDocReturnTag;
        const retType = returnTag.typeExpression
          ? returnTag.typeExpression.type.getText(sourceFile)
          : "any";
        returns = {
          type: retType,
          description: comment.trim(),
        };
      } else if (tagName === "example") {
        examples.push(comment.trim());
      } else if (tagName === "deprecated") {
        deprecated = comment.trim() || "This API is deprecated.";
      } else if (tagName === "see") {
        seeAlso.push(comment.trim());
      }
    }

    return { description, params, returns, examples, deprecated, seeAlso };
  }

  private formatMarkdown(
    moduleName: string,
    filePath: string,
    fileOverview: string,
    symbols: SymbolDoc[]
  ): string {
    const lines: string[] = [];

    lines.push(`---`);
    lines.push(`module: "${moduleName}"`);
    lines.push(`source: "${filePath}"`);
    lines.push(`symbolCount: ${symbols.length}`);
    lines.push(`symbols: [${symbols.map((s) => `"${s.name}"`).join(", ")}]`);
    lines.push(`---`);
    lines.push(``);
    lines.push(`# Module \`${moduleName}\``);
    lines.push(`**Source File**: \`${filePath}\``);
    lines.push(``);

    if (fileOverview) {
      lines.push(`## Overview`);
      lines.push(fileOverview);
      lines.push(``);
    }

    lines.push(`## Index of Symbols`);
    for (const sym of symbols) {
      lines.push(`- [${sym.name}](#${sym.name.toLowerCase()}) (\`${sym.kind}\`) - ${sym.description.split("\n")[0] || "No description"}`);
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    lines.push(`## API Documentation`);
    lines.push(``);

    for (const sym of symbols) {
      lines.push(`### \`${sym.name}\``);
      lines.push(`*Kind*: **${sym.kind}**`);
      lines.push(``);

      if (sym.deprecated) {
        lines.push(`> ⚠️ **Deprecated**: ${sym.deprecated}`);
        lines.push(``);
      }

      lines.push(`\`\`\`typescript\n${sym.signature}\n\`\`\``);
      lines.push(``);

      if (sym.description) {
        lines.push(sym.description);
        lines.push(``);
      }

      if (sym.params.length > 0) {
        lines.push(`#### Parameters`);
        lines.push(`| Parameter | Type | Description |`);
        lines.push(`| :--- | :--- | :--- |`);
        for (const p of sym.params) {
          const opt = p.isOptional ? " *(optional)*" : "";
          lines.push(`| \`${p.name}\`${opt} | \`${p.type}\` | ${p.description.replace(/\|/g, "\\|") || "-"} |`);
        }
        lines.push(``);
      }

      if (sym.returns.description || sym.returns.type !== "void") {
        lines.push(`#### Returns`);
        lines.push(`- **Type**: \`${sym.returns.type}\``);
        if (sym.returns.description) {
          lines.push(`- **Description**: ${sym.returns.description}`);
        }
        lines.push(``);
      }

      if (sym.examples.length > 0) {
        lines.push(`#### Examples`);
        for (const ex of sym.examples) {
          if (ex.startsWith("```")) {
            lines.push(ex);
          } else {
            lines.push(`\`\`\`javascript\n${ex}\n\`\`\``);
          }
        }
        lines.push(``);
      }

      if (sym.seeAlso && sym.seeAlso.length > 0) {
        lines.push(`#### See Also`);
        for (const see of sym.seeAlso) {
          lines.push(`- ${see}`);
        }
        lines.push(``);
      }

      lines.push(`---`);
      lines.push(``);
    }

    return lines.join("\n");
  }
}
