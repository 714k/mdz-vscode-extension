import * as vscode from 'vscode';
import { WebSocketService } from '../services/WebSocketService';
import { getNonce } from '../utils/getNonce';

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private wsService: WebSocketService,
  ) {
    this._panel = panel;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri,
    );

    this._setWebviewMessageListener(this._panel.webview);

    this.setupWebSocketListeners();
  }

  public static render(extensionUri: vscode.Uri, wsService: WebSocketService) {
    console.log('extensionUri', extensionUri);
    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'mdz',
        'mdz',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
          ],
        },
      );

      ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, wsService);
    }
  }

  private setupWebSocketListeners(): void {
    this.wsService.on('connected', () => {
      this._panel.webview.postMessage({ type: 'ws.connected' });
    });

    this.wsService.on('disconnected', () => {
      this._panel.webview.postMessage({ type: 'ws.disconnected' });
    });

    this.wsService.on('chat.response', (message: any) => {
      console.log('on.chat.response: data', message);
      this._panel.webview.postMessage({
        type: 'chat.response',
        data: message,
      });
    });

    this.wsService.on('status', (status: any) => {
      this._panel.webview.postMessage({
        type: 'status',
        data: status,
      });
    });

    this.wsService.on('error', (error: any) => {
      this._panel.webview.postMessage({
        type: 'error',
        data: error,
      });
    });
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
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
              message.context,
              message.requestId,
            );
            break;

          case 'disconnect':
            this.wsService.disconnect();
            break;
        }
      },
      null,
      this._disposables,
    );
  }

  private _getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'dist',
        'webview',
        'assets',
        'index.js',
      ),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        extensionUri,
        'dist',
        'webview',
        'assets',
        'index.css',
      ),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   img-src ${webview.cspSource} data:;
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}' ${webview.cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>mdz</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        window.addEventListener('message', event => {
            const message = event.data;
            window.dispatchEvent(new CustomEvent('vscode-message', { detail: message }));
        });
        window.postMessageToExtension = (message) => {
            vscode.postMessage(message);
        };
    </script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  public dispose() {
    ChatPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
