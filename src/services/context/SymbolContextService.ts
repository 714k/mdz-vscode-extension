import * as vscode from 'vscode';

export interface SymbolContext {
  type: 'symbol';
  name: string;
  kind: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  content: string;
  filePath: string;
  relativePath: string;
  containerName?: string;
}

export class SymbolContextService {
  async findSymbolAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<SymbolContext | null> {
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >('vscode.executeDocumentSymbolProvider', document.uri);

    if (!symbols) {
      return null;
    }

    const symbol = this.findSymbolRecursive(symbols, position);
    if (!symbol) {
      return null;
    }

    const content = document.getText(symbol.range);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const relativePath = workspaceFolder
      ? vscode.workspace.asRelativePath(document.uri)
      : document.fileName;

    return {
      type: 'symbol',
      name: symbol.name,
      kind: vscode.SymbolKind[symbol.kind],
      range: {
        start: {
          line: symbol.range.start.line,
          character: symbol.range.start.character,
        },
        end: {
          line: symbol.range.end.line,
          character: symbol.range.end.character,
        },
      },
      content,
      filePath: document.uri.fsPath,
      relativePath,
      // containerName: symbol.containerName,
    };
  }

  private findSymbolRecursive(
    symbols: vscode.DocumentSymbol[],
    position: vscode.Position,
  ): vscode.DocumentSymbol | null {
    for (const symbol of symbols) {
      if (symbol.range.contains(position)) {
        if (symbol.children.length > 0) {
          const childSymbol = this.findSymbolRecursive(
            symbol.children,
            position,
          );
          if (childSymbol) {
            return childSymbol;
          }
        }
        return symbol;
      }
    }
    return null;
  }

  async extractCurrentSymbol(): Promise<SymbolContext | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    return this.findSymbolAtPosition(editor.document, editor.selection.active);
  }

  async searchSymbolByName(name: string): Promise<SymbolContext[]> {
    const symbols = await vscode.commands.executeCommand<
      vscode.SymbolInformation[]
    >('vscode.executeWorkspaceSymbolProvider', name);

    if (!symbols) {
      return [];
    }

    const results: SymbolContext[] = [];

    for (const symbol of symbols.slice(0, 10)) {
      try {
        const document = await vscode.workspace.openTextDocument(
          symbol.location.uri,
        );
        const content = document.getText(symbol.location.range);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          symbol.location.uri,
        );
        const relativePath = workspaceFolder
          ? vscode.workspace.asRelativePath(symbol.location.uri)
          : document.fileName;

        results.push({
          type: 'symbol',
          name: symbol.name,
          kind: vscode.SymbolKind[symbol.kind],
          range: {
            start: {
              line: symbol.location.range.start.line,
              character: symbol.location.range.start.character,
            },
            end: {
              line: symbol.location.range.end.line,
              character: symbol.location.range.end.character,
            },
          },
          content,
          filePath: symbol.location.uri.fsPath,
          relativePath,
          containerName: symbol.containerName,
        });
      } catch (error) {
        console.error('Failed to extract symbol:', error);
      }
    }

    return results;
  }
}
