import { createSignal } from 'solid-js';

export interface Message {
  type: string;
  data?: any;
}

export const [wsConnected, setWsConnected] = createSignal(false);
export const [wsStatus, setWsStatus] = createSignal<string>('disconnected');

// In browser (dev mode) use the same host as the page so the Vite proxy
// forwards the WebSocket to the backend. In VSCode this constant is unused.
const WS_URL = `ws://${window.location.host}/api/v1/ws`;

class WebSocketClient {
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private directWs: WebSocket | null = null;
  private readonly isVSCode: boolean;
  private browserContext: Record<string, any> = {};

  constructor() {
    this.isVSCode = typeof (window as any).postMessageToExtension === 'function';
    this.setupVSCodeMessageListener();
  }

  private setupVSCodeMessageListener() {
    window.addEventListener('vscode-message', ((event: CustomEvent) => {
      const message = event.detail;
      this.handleVSCodeMessage(message);
    }) as EventListener);
  }

  private handleVSCodeMessage(message: Message) {
    switch (message.type) {
      case 'ws.connected':
        setWsConnected(true);
        setWsStatus('connected');
        break;
      case 'ws.disconnected':
        setWsConnected(false);
        setWsStatus('disconnected');
        break;
      case 'chat.response':
      case 'status':
      case 'error':
      case 'context.updated':
        this.notifyHandlers(message.type, message.data);
        break;
    }
  }

  on(messageType: string, handler: (data: any) => void) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
    return () => {
      this.messageHandlers.get(messageType)?.delete(handler);
    };
  }

  private notifyHandlers(messageType: string, data: any) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  connect(token?: string) {
    if (this.isVSCode) {
      (window as any).postMessageToExtension({ command: 'connect' });
    } else {
      this.connectDirect(token);
    }
  }

  private connectDirect(token?: string) {
    if (
      this.directWs &&
      (this.directWs.readyState === WebSocket.OPEN ||
        this.directWs.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const storedToken = token ?? localStorage.getItem('mdz_dev_token');
    if (token) {
      localStorage.setItem('mdz_dev_token', token);
    }

    const url = storedToken ? `${WS_URL}?token=${storedToken}` : WS_URL;
    setWsStatus('connecting');
    this.directWs = new WebSocket(url);

    this.directWs.addEventListener('open', () => {
      setWsConnected(true);
      setWsStatus('connected');
    });

    this.directWs.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'chat.response':
            this.notifyHandlers('chat.response', message);
            break;
          case 'status':
            this.notifyHandlers('status', message.payload);
            break;
          case 'error':
            this.notifyHandlers('error', message.payload);
            break;
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });

    this.directWs.addEventListener('close', () => {
      setWsConnected(false);
      setWsStatus('disconnected');
      this.directWs = null;
    });

    this.directWs.addEventListener('error', () => {
      setWsConnected(false);
      setWsStatus('error');
    });
  }

  async addContext(type: 'file' | 'folder' | 'selection' | 'symbol'): Promise<void> {
    if (this.isVSCode) {
      (window as any).postMessageToExtension({ command: 'addContext', type });
      return;
    }
    await this.addBrowserContext(type);
  }

  removeContext(id: string): void {
    if (this.isVSCode) {
      (window as any).postMessageToExtension({ command: 'removeContext', id });
    } else {
      delete this.browserContext[id];
      this.notifyHandlers('context.updated', { ...this.browserContext });
    }
  }

  private async addBrowserContext(type: string): Promise<void> {
    switch (type) {
      case 'file': {
        const [handle] = await (window as any).showOpenFilePicker({ multiple: false });
        const file = await handle.getFile();
        const content = await file.text();
        const id = `file:${file.name}`;
        this.browserContext[id] = {
          type: 'file',
          path: file.name,
          relativePath: file.name,
          content,
          language: this.langFromFilename(file.name),
          size: file.size,
          lines: content.split('\n').length,
        };
        this.notifyHandlers('context.updated', { ...this.browserContext });
        break;
      }
      case 'selection': {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          throw new Error('No text selected');
        }
        const content = selection.toString();
        const id = `selection:browser:${Date.now()}`;
        this.browserContext[id] = {
          type: 'selection',
          content,
          startLine: 0,
          endLine: 0,
          filePath: '',
          relativePath: 'browser-selection',
          language: 'text',
        };
        this.notifyHandlers('context.updated', { ...this.browserContext });
        break;
      }
      case 'folder': {
        const dirHandle = await (window as any).showDirectoryPicker();
        const structure = await this.buildDirTree(dirHandle, 0);
        const id = `folder:${dirHandle.name}`;
        this.browserContext[id] = {
          type: 'folder',
          path: dirHandle.name,
          relativePath: dirHandle.name,
          structure,
          totalFiles: this.countTreeFiles(structure),
          totalSize: 0,
        };
        this.notifyHandlers('context.updated', { ...this.browserContext });
        break;
      }
      case 'symbol': {
        const name = window.prompt('Symbol name:');
        if (!name) return;
        const content = window.getSelection()?.toString() ?? '';
        const id = `symbol:${name}:browser`;
        this.browserContext[id] = {
          type: 'symbol',
          name,
          kind: 'Unknown',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          content,
          filePath: '',
          relativePath: 'browser',
        };
        this.notifyHandlers('context.updated', { ...this.browserContext });
        break;
      }
    }
  }

  private langFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascriptreact',
      py: 'python', rs: 'rust', go: 'go', java: 'java', cs: 'csharp',
      cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json', md: 'markdown',
    };
    return map[ext] ?? 'plaintext';
  }

  private async buildDirTree(handle: any, depth: number): Promise<any> {
    const IGNORE = ['node_modules', '.git', 'dist', 'build', '__pycache__', 'venv'];
    const MAX_DEPTH = 5;
    const node: any = { name: handle.name, type: 'directory', path: handle.name, children: [] };
    if (depth >= MAX_DEPTH) return node;
    for await (const [name, child] of handle.entries()) {
      if (IGNORE.some((p) => name.includes(p))) continue;
      if (child.kind === 'directory') {
        node.children.push(await this.buildDirTree(child, depth + 1));
      } else {
        const file = await child.getFile();
        node.children.push({
          name,
          type: 'file',
          path: name,
          size: file.size,
          extension: '.' + name.split('.').pop(),
        });
      }
    }
    return node;
  }

  private countTreeFiles(node: any): number {
    if (node.type === 'file') return 1;
    return (node.children ?? []).reduce((sum: number, c: any) => sum + this.countTreeFiles(c), 0);
  }

  sendMessage(content: string, context: any = {}) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const { model, ...contextItems } = context;

    if (this.isVSCode) {
      (window as any).postMessageToExtension({
        command: 'sendMessage',
        content,
        model,
        context: contextItems,
        requestId,
      });
    } else if (this.directWs?.readyState === WebSocket.OPEN) {
      this.directWs.send(
        JSON.stringify({
          type: 'chat.message',
          payload: { content, model, context: { ...contextItems, ...this.browserContext } },
          request_id: requestId,
        }),
      );
    }

    return requestId;
  }

  disconnect() {
    if (this.isVSCode) {
      (window as any).postMessageToExtension({ command: 'disconnect' });
    } else {
      this.directWs?.close();
      this.directWs = null;
    }
  }
}

export const wsClient = new WebSocketClient();
