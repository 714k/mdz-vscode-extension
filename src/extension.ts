import * as vscode from 'vscode';
import { ChatPanel } from './panels/ChatPanel';
import { SidebarProvider } from './providers/SidebarProvider';
import { AuthService } from './services/AuthService';
import { WebSocketService } from './services/WebSocketService';
import { ContextService } from './services/context/AgregatorContextService';

let authService: AuthService;
let wsService: WebSocketService;
let contextService: ContextService;

export function activate(context: vscode.ExtensionContext) {
  console.log('mdz extension activated');

  authService = new AuthService(context);
  wsService = new WebSocketService(authService);
  contextService = new ContextService();

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    wsService,
    contextService,
  );

  const openPanelCommand = vscode.commands.registerCommand(
    'mdz.openPanel',
    () => {
      ChatPanel.render(context.extensionUri, wsService, contextService);
    },
  );

  const loginCommand = vscode.commands.registerCommand(
    'mdz.login',
    async () => {
      try {
        await authService.login();
        vscode.window.showInformationMessage('Logged in successfully');
      } catch (error) {
        vscode.window.showErrorMessage('Login failed');
      }
    },
  );

  const addFileContextCommand = vscode.commands.registerCommand(
    'mdz.addFileContext',
    async () => {
      try {
        const id = await contextService.addFileContext();
        vscode.window.showInformationMessage(`Added file context: ${id}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(error.message);
      }
    },
  );

  const addSelectionContextCommand = vscode.commands.registerCommand(
    'mdz.addSelectionContext',
    async () => {
      try {
        const id = await contextService.addSelectionContext();
        vscode.window.showInformationMessage(`Added selection context: ${id}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(error.message);
      }
    },
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mdz.chatView', sidebarProvider),
    openPanelCommand,
    loginCommand,
    addFileContextCommand,
    addSelectionContextCommand,
  );
}

export function deactivate() {
  wsService?.disconnect();
}
