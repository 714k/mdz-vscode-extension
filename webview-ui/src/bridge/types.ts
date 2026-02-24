export interface ExtensionBridge {
  sendPrompt(prompt: string): void;
  onMessage(callback: (msg: any) => void): void;
}
