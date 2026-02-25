import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface FolderContext {
  type: 'folder';
  path: string;
  relativePath: string;
  structure: FileTreeNode;
  totalFiles: number;
  totalSize: number;
}

export interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileTreeNode[];
  size?: number;
  extension?: string;
}

export class FolderContextService {
  private readonly IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    '__pycache__',
    '.vscode',
    '.idea',
    'venv',
    'env',
    '.DS_Store',
  ];

  private readonly MAX_DEPTH = 5;
  private readonly MAX_FILES = 500;

  async extractFolderContext(uri: vscode.Uri): Promise<FolderContext> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const relativePath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath)
      : path.basename(uri.fsPath);

    const structure = await this.buildFileTree(uri.fsPath, 0);
    const { totalFiles, totalSize } = this.calculateStats(structure);

    return {
      type: 'folder',
      path: uri.fsPath,
      relativePath,
      structure,
      totalFiles,
      totalSize,
    };
  }

  private async buildFileTree(
    dirPath: string,
    depth: number,
  ): Promise<FileTreeNode> {
    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);

    if (!stats.isDirectory()) {
      return {
        name,
        type: 'file',
        path: dirPath,
        size: stats.size,
        extension: path.extname(dirPath),
      };
    }

    const node: FileTreeNode = {
      name,
      type: 'directory',
      path: dirPath,
      children: [],
    };

    if (depth >= this.MAX_DEPTH) {
      return node;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.shouldIgnore(entry.name)) {
          continue;
        }

        const childPath = path.join(dirPath, entry.name);
        const childNode = await this.buildFileTree(childPath, depth + 1);
        node.children!.push(childNode);

        if (this.countFiles(node) > this.MAX_FILES) {
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to read directory ${dirPath}:`, error);
    }

    return node;
  }

  private shouldIgnore(name: string): boolean {
    return this.IGNORE_PATTERNS.some((pattern) => name.includes(pattern));
  }

  private countFiles(node: FileTreeNode): number {
    if (node.type === 'file') {
      return 1;
    }

    return (node.children || []).reduce(
      (sum, child) => sum + this.countFiles(child),
      0,
    );
  }

  private calculateStats(node: FileTreeNode): {
    totalFiles: number;
    totalSize: number;
  } {
    if (node.type === 'file') {
      return { totalFiles: 1, totalSize: node.size || 0 };
    }

    let totalFiles = 0;
    let totalSize = 0;

    for (const child of node.children || []) {
      const childStats = this.calculateStats(child);
      totalFiles += childStats.totalFiles;
      totalSize += childStats.totalSize;
    }

    return { totalFiles, totalSize };
  }

  async extractCurrentFolder(): Promise<FolderContext | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const folderPath = path.dirname(editor.document.uri.fsPath);
    return this.extractFolderContext(vscode.Uri.file(folderPath));
  }
}
