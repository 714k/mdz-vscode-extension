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

  sendMessage(content: string, context: any = {}) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (this.isVSCode) {
      (window as any).postMessageToExtension({
        command: 'sendMessage',
        content,
        context,
        requestId,
      });
    } else if (this.directWs?.readyState === WebSocket.OPEN) {
      this.directWs.send(
        JSON.stringify({
          type: 'chat.message',
          payload: { content, context },
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
