import ts from "typescript";
import path from "node:path";
import fs from "node:fs/promises";

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
export class AstGraphGenerator {
  private outDir: string;

  constructor(options: AstGraphOptions = {}) {
    this.outDir = path.resolve(options.outDir || "dist/graph");
  }

  /**
   * Generates AST graph from given .d.ts files.
   */
  public async generateFromDts(dtsFiles: string[]): Promise<AstGraphData> {
    const nodes: Map<string, AstGraphNode> = new Map();
    const edges: AstGraphEdge[] = [];

    const resolvedFiles = dtsFiles.map((f) => path.resolve(f));
    const program = ts.createProgram(resolvedFiles, {
      declaration: true,
      emitDeclarationOnly: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
    });

    const knownSymbolNames = new Set<string>();

    // Pass 1: Collect all declared symbols
    for (const dtsPath of resolvedFiles) {
      const sourceFile = program.getSourceFile(dtsPath);
      if (!sourceFile) continue;

      const moduleName = path.basename(dtsPath, ".d.ts");
      const moduleId = `module:${moduleName}`;
      nodes.set(moduleId, {
        id: moduleId,
        name: moduleName,
        kind: "Module",
        filePath: dtsPath,
      });

      for (const statement of sourceFile.statements) {
        this.collectSymbols(statement, sourceFile, moduleName, dtsPath, nodes, knownSymbolNames);
      }
    }

    // Pass 2: Extract type references and relationships between known symbols
    for (const dtsPath of resolvedFiles) {
      const sourceFile = program.getSourceFile(dtsPath);
      if (!sourceFile) continue;
      const moduleName = path.basename(dtsPath, ".d.ts");

      for (const statement of sourceFile.statements) {
        this.extractEdges(statement, sourceFile, moduleName, knownSymbolNames, edges);
      }
    }

    const graphData: AstGraphData = {
      nodes: Array.from(nodes.values()),
      edges,
      generatedAt: Date.now(),
    };

    await this.persist(graphData);
    return graphData;
  }

  private collectSymbols(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    moduleName: string,
    filePath: string,
    nodes: Map<string, AstGraphNode>,
    knownNames: Set<string>
  ): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.getText(sourceFile);
      const id = `${moduleName}.${name}`;
      knownNames.add(name);
      nodes.set(id, {
        id,
        name,
        kind: "Function",
        filePath,
        signature: node.getText(sourceFile).split(/\{|\;/)[0].trim(),
      });
    } else if (ts.isClassDeclaration(node) && node.name) {
      const name = node.name.getText(sourceFile);
      const id = `${moduleName}.${name}`;
      knownNames.add(name);
      nodes.set(id, {
        id,
        name,
        kind: "Class",
        filePath,
        signature: `class ${name}`,
      });

      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name) {
          const methodName = member.name.getText(sourceFile);
          const methodId = `${moduleName}.${name}.${methodName}`;
          nodes.set(methodId, {
            id: methodId,
            name: `${name}.${methodName}`,
            kind: "Method",
            filePath,
            signature: member.getText(sourceFile).split(/\{|\;/)[0].trim(),
          });
        }
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.getText(sourceFile);
      const id = `${moduleName}.${name}`;
      knownNames.add(name);
      nodes.set(id, {
        id,
        name,
        kind: "Interface",
        filePath,
        signature: `interface ${name}`,
      });
    } else if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.getText(sourceFile);
      const id = `${moduleName}.${name}`;
      knownNames.add(name);
      nodes.set(id, {
        id,
        name,
        kind: "TypeAlias",
        filePath,
        signature: node.getText(sourceFile).trim(),
      });
    }
  }

  private extractEdges(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    moduleName: string,
    knownNames: Set<string>,
    edges: AstGraphEdge[]
  ): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const fnName = node.name.getText(sourceFile);
      const fnId = `${moduleName}.${fnName}`;

      // Check parameters
      for (const param of node.parameters) {
        if (param.type) {
          const typeNames = this.findReferencedTypeNames(param.type, sourceFile, knownNames);
          for (const targetName of typeNames) {
            edges.push({
              source: fnId,
              target: `${moduleName}.${targetName}`,
              relation: "parameter_type",
            });
          }
        }
      }

      // Check return type
      if (node.type) {
        const returnTypeNames = this.findReferencedTypeNames(node.type, sourceFile, knownNames);
        for (const targetName of returnTypeNames) {
          edges.push({
            source: fnId,
            target: `${moduleName}.${targetName}`,
            relation: "returns_type",
          });
        }
      }
    } else if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.getText(sourceFile);
      const classId = `${moduleName}.${className}`;

      // Heritage clauses (extends, implements)
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          const relation = clause.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements";
          for (const type of clause.types) {
            const targetName = type.expression.getText(sourceFile);
            if (knownNames.has(targetName)) {
              edges.push({
                source: classId,
                target: `${moduleName}.${targetName}`,
                relation,
              });
            }
          }
        }
      }

      // Member methods
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name) {
          const methodName = member.name.getText(sourceFile);
          const methodId = `${moduleName}.${className}.${methodName}`;
          edges.push({
            source: methodId,
            target: classId,
            relation: "member_of",
          });

          for (const param of member.parameters) {
            if (param.type) {
              const typeNames = this.findReferencedTypeNames(param.type, sourceFile, knownNames);
              for (const targetName of typeNames) {
                edges.push({
                  source: methodId,
                  target: `${moduleName}.${targetName}`,
                  relation: "parameter_type",
                });
              }
            }
          }

          if (member.type) {
            const returnTypeNames = this.findReferencedTypeNames(member.type, sourceFile, knownNames);
            for (const targetName of returnTypeNames) {
              edges.push({
                source: methodId,
                target: `${moduleName}.${targetName}`,
                relation: "returns_type",
              });
            }
          }
        }
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.getText(sourceFile);
      const typeId = `${moduleName}.${typeName}`;
      const referenced = this.findReferencedTypeNames(node.type, sourceFile, knownNames);
      for (const target of referenced) {
        if (target !== typeName) {
          edges.push({
            source: typeId,
            target: `${moduleName}.${target}`,
            relation: "references_type",
          });
        }
      }
    }
  }

  private findReferencedTypeNames(
    typeNode: ts.TypeNode,
    sourceFile: ts.SourceFile,
    knownNames: Set<string>
  ): string[] {
    const found: string[] = [];
    const visit = (n: ts.Node) => {
      if (ts.isTypeReferenceNode(n)) {
        const typeName = n.typeName.getText(sourceFile);
        if (knownNames.has(typeName)) {
          found.push(typeName);
        }
      } else if (ts.isIdentifier(n)) {
        const name = n.getText(sourceFile);
        if (knownNames.has(name)) {
          found.push(name);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(typeNode);
    return Array.from(new Set(found));
  }

  /**
   * Persists graph data to JSON and Mermaid flowchart diagrams.
   */
  public async persist(graph: AstGraphData): Promise<{ jsonPath: string; mermaidPath: string }> {
    await fs.mkdir(this.outDir, { recursive: true });

    const jsonPath = path.join(this.outDir, "ast-graph.json");
    await fs.writeFile(jsonPath, JSON.stringify(graph, null, 2), "utf-8");

    const mermaidPath = path.join(this.outDir, "ast-graph.mermaid");
    const mermaidContent = this.formatMermaid(graph);
    await fs.writeFile(mermaidPath, mermaidContent, "utf-8");

    return { jsonPath, mermaidPath };
  }

  /**
   * Converts graph data into a clean Mermaid flowchart diagram.
   */
  public formatMermaid(graph: AstGraphData): string {
    const lines: string[] = ["flowchart TD"];

    // Add nodes with shape based on kind
    for (const node of graph.nodes) {
      if (node.kind === "Module") continue;
      const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
      if (node.kind === "Class") {
        lines.push(`    ${safeId}["class ${node.name}"]:::classNode`);
      } else if (node.kind === "Interface" || node.kind === "TypeAlias") {
        lines.push(`    ${safeId}["type ${node.name}"]:::typeNode`);
      } else if (node.kind === "Function") {
        lines.push(`    ${safeId}["fn ${node.name}()"]:::fnNode`);
      } else {
        lines.push(`    ${safeId}["${node.name}"]`);
      }
    }

    // Add edges
    for (const edge of graph.edges) {
      const srcId = edge.source.replace(/[^a-zA-Z0-9_]/g, "_");
      const tgtId = edge.target.replace(/[^a-zA-Z0-9_]/g, "_");
      if (edge.relation === "parameter_type") {
        lines.push(`    ${srcId} -.->|param| ${tgtId}`);
      } else if (edge.relation === "returns_type") {
        lines.push(`    ${srcId} -->|returns| ${tgtId}`);
      } else if (edge.relation === "extends" || edge.relation === "implements") {
        lines.push(`    ${srcId} ==>|${edge.relation}| ${tgtId}`);
      } else if (edge.relation === "member_of") {
        lines.push(`    ${srcId} ---|method| ${tgtId}`);
      } else {
        lines.push(`    ${srcId} --> ${tgtId}`);
      }
    }

    lines.push("");
    lines.push("    classDef classNode fill:#2563eb,stroke:#1d4ed8,color:#fff;");
    lines.push("    classDef typeNode fill:#7c3aed,stroke:#6d28d9,color:#fff;");
    lines.push("    classDef fnNode fill:#059669,stroke:#047857,color:#fff;");

    return lines.join("\n");
  }
}
