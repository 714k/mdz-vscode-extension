import * as vscode from 'vscode';
import { FileContextService } from './FileContextService';
import { SelectionContextService, SelectionContext } from './SelectionContextService';
import { FolderContextService } from './FolderContextService';
import { SymbolContextService } from './SymbolContextService';

export type ContextItem =
  | Awaited<ReturnType<FileContextService['extractFileContext']>>
  | ReturnType<SelectionContextService['extractSelection']>
  | Awaited<ReturnType<FolderContextService['extractFolderContext']>>
  | Awaited<ReturnType<SymbolContextService['extractCurrentSymbol']>>;

export class ContextService {
  private fileService: FileContextService;
  private selectionService: SelectionContextService;
  private folderService: FolderContextService;
  private symbolService: SymbolContextService;

  private activeContextItems: Map<string, ContextItem> = new Map();

  private _lastKnownEditor: vscode.TextEditor | undefined;
  private _lastKnownSelection: vscode.Selection | undefined;
  private _disposables: vscode.Disposable[] = [];

  constructor() {
    this.fileService = new FileContextService();
    this.selectionService = new SelectionContextService();
    this.folderService = new FolderContextService();
    this.symbolService = new SymbolContextService();

    this._lastKnownEditor = vscode.window.activeTextEditor;
    this._lastKnownSelection = vscode.window.activeTextEditor?.selection;

    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this._lastKnownEditor = editor;
          this._lastKnownSelection = editor.selection;
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (!event.selections[0].isEmpty) {
          this._lastKnownEditor = event.textEditor;
          this._lastKnownSelection = event.selections[0];
        }
      }),
    );
  }

  async addFileContext(uri?: vscode.Uri): Promise<string> {
    let resolvedUri = uri;
    if (!resolvedUri) {
      const picked = await vscode.window.showOpenDialog({ canSelectMany: false, canSelectFiles: true, canSelectFolders: false });
      if (!picked || picked.length === 0) {
        throw new Error('No file selected');
      }
      resolvedUri = picked[0];
    }

    const context = await this.fileService.extractFileContext(resolvedUri);

    if (!context) {
      throw new Error('No file context available');
    }

    const id = `file:${context.relativePath}`;
    this.activeContextItems.set(id, context);
    return id;
  }

  async addSelectionContext(): Promise<string> {
    let context: SelectionContext | null = this.selectionService.extractSelection();

    if (!context && this._lastKnownEditor && this._lastKnownSelection && !this._lastKnownSelection.isEmpty) {
      const editor = this._lastKnownEditor;
      const selection = this._lastKnownSelection;
      const content = editor.document.getText(selection);
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      const relativePath = workspaceFolder
        ? vscode.workspace.asRelativePath(editor.document.uri)
        : editor.document.fileName;

      context = {
        type: 'selection',
        content,
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
        filePath: editor.document.uri.fsPath,
        relativePath,
        language: editor.document.languageId,
      };
    }

    if (!context) {
      throw new Error('No selection available. Select text in the editor first.');
    }

    const id = `selection:${context.relativePath}:${context.startLine}-${context.endLine}`;
    this.activeContextItems.set(id, context);
    return id;
  }

  async addFolderContext(uri?: vscode.Uri): Promise<string> {
    let resolvedUri = uri;
    if (!resolvedUri) {
      const picked = await vscode.window.showOpenDialog({ canSelectMany: false, canSelectFiles: false, canSelectFolders: true });
      if (!picked || picked.length === 0) {
        throw new Error('No folder selected');
      }
      resolvedUri = picked[0];
    }

    const context = await this.folderService.extractFolderContext(resolvedUri);

    if (!context) {
      throw new Error('No folder context available');
    }

    const id = `folder:${context.relativePath}`;
    this.activeContextItems.set(id, context);
    return id;
  }

  async addSymbolContext(): Promise<string> {
    const query = await vscode.window.showInputBox({
      prompt: 'Search for a symbol',
      placeHolder: 'e.g. MyClass, myFunction',
    });

    if (!query) {
      throw new Error('No symbol name provided');
    }

    const symbols = await this.symbolService.searchSymbolByName(query);

    if (symbols.length === 0) {
      throw new Error(`No symbol found for "${query}"`);
    }

    let selected = symbols[0];

    if (symbols.length > 1) {
      const pick = await vscode.window.showQuickPick(
        symbols.map((s) => ({ label: s.name, description: `${s.kind} — ${s.relativePath}`, symbol: s })),
        { placeHolder: 'Select symbol' },
      );
      if (!pick) {
        throw new Error('No symbol selected');
      }
      selected = pick.symbol;
    }

    const id = `symbol:${selected.name}:${selected.relativePath}`;
    this.activeContextItems.set(id, selected);
    return id;
  }

  removeContext(id: string): void {
    this.activeContextItems.delete(id);
  }

  clearContext(): void {
    this.activeContextItems.clear();
  }

  getActiveContext(): Map<string, ContextItem> {
    return new Map(this.activeContextItems);
  }

  serializeContext(): any {
    const serialized: any = {};

    this.activeContextItems.forEach((value, key) => {
      serialized[key] = value;
    });

    return serialized;
  }

  async parseContextMention(mention: string): Promise<string | null> {
    if (mention.startsWith('@file:')) {
      const filePath = mention.substring(6);
      return await this.addFileContext(vscode.Uri.file(filePath));
    } else if (mention === '@selection') {
      return await this.addSelectionContext();
    } else if (mention.startsWith('@folder:')) {
      const folderPath = mention.substring(8);
      return await this.addFolderContext(vscode.Uri.file(folderPath));
    } else if (mention.startsWith('@symbol:')) {
      return await this.addSymbolContext();
    }

    return null;
  }

  dispose(): void {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }
}
