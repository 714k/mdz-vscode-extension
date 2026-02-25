import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketService } from '../services/WebSocketService';
import { ContextService } from '../services/context/AgregatorContextService';
import { getNonce } from '../utils/getNonce';

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly wsService: WebSocketService,
    private readonly contextService: ContextService,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this.setupWebSocketListeners();

    webviewView.webview.onDidReceiveMessage(async (message: any) => {
      switch (message.command) {
        case 'connect':
          try {
            await this.wsService.connect();
          } catch (error: any) {
            if (
              error.message?.includes('403') ||
              error.message?.includes('Unexpected server response')
            ) {
              const action = await vscode.window.showErrorMessage(
                'WebSocket connection requires authentication.',
                'Login',
              );
              if (action === 'Login') {
                await vscode.commands.executeCommand('mdz.login');
                try {
                  await this.wsService.connect();
                } catch {}
              }
            } else {
              vscode.window.showErrorMessage(
                `Connection failed: ${error.message}`,
              );
            }
          }
          break;

        case 'sendMessage':
          this.wsService.sendChatMessage(
            message.content,
            message.model,
            { ...message.context, ...this.contextService.serializeContext() },
            message.requestId,
          );
          break;

        case 'addContext':
          try {
            switch (message.type) {
              case 'file':
                await this.contextService.addFileContext();
                break;
              case 'selection':
                await this.contextService.addSelectionContext();
                break;
              case 'folder':
                await this.contextService.addFolderContext();
                break;
              case 'symbol':
                await this.contextService.addSymbolContext();
                break;
              default:
                throw new Error('Unknown context type');
            }
            webviewView.webview.postMessage({
              type: 'context.updated',
              data: this.contextService.serializeContext(),
            });
          } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to add context: ${error.message}`);
          }
          break;

        case 'removeContext':
          this.contextService.removeContext(message.id);
          webviewView.webview.postMessage({
            type: 'context.updated',
            data: this.contextService.serializeContext(),
          });
          break;

        case 'disconnect':
          this.wsService.disconnect();
          break;
      }
    });
  }

  private setupWebSocketListeners(): void {
    this.wsService.on('connected', () => {
      this._view?.webview.postMessage({ type: 'ws.connected' });
    });

    this.wsService.on('disconnected', () => {
      this._view?.webview.postMessage({ type: 'ws.disconnected' });
    });

    this.wsService.on('chat.response', (message: any) => {
      this._view?.webview.postMessage({ type: 'chat.response', data: message });
    });

    this.wsService.on('status', (status: any) => {
      this._view?.webview.postMessage({ type: 'status', data: status });
    });

    this.wsService.on('error', (error: any) => {
      this._view?.webview.postMessage({ type: 'error', data: error });
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const webviewPath = path.join(this._extensionUri.fsPath, 'dist', 'webview');
    const indexPath = path.join(webviewPath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-errorForeground);
      background: var(--vscode-editor-background);
    }
    pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 10px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Webview build not found</h1>
  <p>Expected: <code>${indexPath}</code></p>
  <h3>Run:</h3>
  <pre>npm run compile:webview</pre>
</body>
</html>`;
    }

    let html = fs.readFileSync(indexPath, 'utf8');

    // Convert asset paths to vscode-resource URIs
    html = html.replace(/(href|src)="([^"]+)"/g, (match, attr, assetPath) => {
      if (
        assetPath.startsWith('http://') ||
        assetPath.startsWith('https://') ||
        assetPath.startsWith('data:')
      ) {
        return match;
      }
      const cleanPath = assetPath.replace(/^\//, '');
      const fullPath = path.join(webviewPath, cleanPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`Asset not found: ${fullPath}`);
      }
      const resourceUri = webview.asWebviewUri(vscode.Uri.file(fullPath));
      return `${attr}="${resourceUri}"`;
    });

    const nonce = getNonce();

    const cspContent = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource}`,
    ].join('; ');

    html = html.replace(
      '<head>',
      `<head>\n  <meta http-equiv="Content-Security-Policy" content="${cspContent}">`,
    );

    // Inject the VSCode bridge before closing body
    const bridgeScript = `<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  window.addEventListener('message', event => {
    const message = event.data;
    window.dispatchEvent(new CustomEvent('vscode-message', { detail: message }));
  });
  window.postMessageToExtension = (message) => {
    vscode.postMessage(message);
  };
</script>`;
    html = html.replace('</body>', `${bridgeScript}\n</body>`);

    // Add nonce to all script tags
    html = html.replace(/<script(?! nonce)/g, `<script nonce="${nonce}"`);

    return html;
  }
}
