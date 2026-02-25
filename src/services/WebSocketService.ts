import WebSocket, { ErrorEvent } from 'ws';
import { EventEmitter } from 'events';
import { AuthService } from './AuthService';

export interface WSMessage {
  type: string;
  payload?: any;
  request_id?: string;
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private wasConnected = false;
  private readonly WS_URL = 'ws://localhost:8000/api/v1/ws';

  constructor(private authService: AuthService) {
    super();
  }

  async connect(): Promise<void> {
    const token = this.authService.getToken();
    const url = token ? `${this.WS_URL}?token=${token}` : this.WS_URL;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        this.startHeartbeat();
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: ErrorEvent) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });
    });
  }

  private handleMessage(message: WSMessage): void {
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'status':
        this.emit('status', message.payload);
        break;
      case 'chat.response':
        this.emit('chat.response', message);
        break;
      case 'chat.stream':
        this.emit('chat.stream', message);
        break;
      case 'error':
        this.emit('error', message.payload);
        break;
      case 'heartbeat_ack':
        break;
      default:
        this.emit('message', message);
    }
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  sendChatMessage(content: string, model: string, context: any = {}, requestId: string): void {
    this.send({
      type: 'chat.message',
      payload: { content, model, context },
      request_id: requestId,
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.reconnectTimer = null;
      this.connect().catch(console.error);
    }, 5000);
  }

  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
