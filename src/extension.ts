import * as vscode from 'vscode';
import { ChatPanel } from './panels/ChatPanel';
import { SidebarProvider } from './providers/SidebarProvider';
import { AuthService } from './services/AuthService';
import { WebSocketService } from './services/WebSocketService';

let authService: AuthService;
let wsService: WebSocketService;

export function activate(context: vscode.ExtensionContext) {
  console.log('mdz extension activated');

  authService = new AuthService(context);
  wsService = new WebSocketService(authService);

  const openPanelCommand = vscode.commands.registerCommand(
    'mdz.openPanel',
    () => {
      ChatPanel.render(context.extensionUri, wsService);
    },
  );

  const loginCommand = vscode.commands.registerCommand(
    'mdz.login',
    async () => {
      await authService.login();
      vscode.window.showInformationMessage('Logged in successfully');
    },
  );

  const sidebarProvider = new SidebarProvider(context.extensionUri, wsService);

  context.subscriptions.push(
    openPanelCommand,
    loginCommand,
    vscode.window.registerWebviewViewProvider('mdz.mainView', sidebarProvider),
  );

  ChatPanel.render(context.extensionUri, wsService);
}

export function deactivate() {
  wsService?.disconnect();
}
