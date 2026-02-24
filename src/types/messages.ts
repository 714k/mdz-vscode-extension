export interface ToWebviewMessage {
  type: 'update' | 'command' | 'error' | 'theme';
  payload?: any; // Ya está como opcional, así que el problema es el casting
}

export interface FromWebviewMessage {
  command: 'ready' | 'action' | 'request' | 'log';
  data?: any;
}
