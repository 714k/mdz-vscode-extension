import * as vscode from 'vscode';

export interface SelectionContext {
  type: 'selection';
  content: string;
  startLine: number;
  endLine: number;
  filePath: string;
  relativePath: string;
  language: string;
}

export class SelectionContextService {
  extractSelection(): SelectionContext | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
      return null;
    }

    const selection = editor.selection;
    const content = editor.document.getText(selection);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      editor.document.uri,
    );

    const relativePath = workspaceFolder
      ? vscode.workspace.asRelativePath(editor.document.uri)
      : editor.document.fileName;

    return {
      type: 'selection',
      content,
      startLine: selection.start.line + 1,
      endLine: selection.end.line + 1,
      filePath: editor.document.uri.fsPath,
      relativePath,
      language: editor.document.languageId,
    };
  }

  async expandSelection(lines: number = 5): Promise<SelectionContext | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const selection = editor.selection;
    const startLine = Math.max(0, selection.start.line - lines);
    const endLine = Math.min(
      editor.document.lineCount - 1,
      selection.end.line + lines,
    );

    const expandedRange = new vscode.Range(
      startLine,
      0,
      endLine,
      Number.MAX_VALUE,
    );
    const content = editor.document.getText(expandedRange);

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      editor.document.uri,
    );
    const relativePath = workspaceFolder
      ? vscode.workspace.asRelativePath(editor.document.uri)
      : editor.document.fileName;

    return {
      type: 'selection',
      content,
      startLine: startLine + 1,
      endLine: endLine + 1,
      filePath: editor.document.uri.fsPath,
      relativePath,
      language: editor.document.languageId,
    };
  }
}
