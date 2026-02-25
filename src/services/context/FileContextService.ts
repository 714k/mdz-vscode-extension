import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface FileContext {
  type: 'file';
  path: string;
  relativePath: string;
  content: string;
  language: string;
  size: number;
  lines: number;
}

export class FileContextService {
  async extractFileContext(uri: vscode.Uri): Promise<FileContext> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const relativePath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath)
      : path.basename(uri.fsPath);

    const content = await fs.readFile(uri.fsPath, 'utf-8');
    const document = await vscode.workspace.openTextDocument(uri);

    return {
      type: 'file',
      path: uri.fsPath,
      relativePath,
      content,
      language: document.languageId,
      size: content.length,
      lines: document.lineCount,
    };
  }

  async extractCurrentFile(): Promise<FileContext | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    return this.extractFileContext(editor.document.uri);
  }

  async extractFileByPath(filePath: string): Promise<FileContext | null> {
    try {
      const uri = vscode.Uri.file(filePath);
      return await this.extractFileContext(uri);
    } catch (error) {
      console.error('Failed to extract file context:', error);
      return null;
    }
  }
}
