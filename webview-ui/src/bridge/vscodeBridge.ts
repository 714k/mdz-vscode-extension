import { ExtensionBridge } from './types';

declare function acquireVsCodeApi(): any;

export function createVSCodeBridge(): ExtensionBridge {
  const vscode = acquireVsCodeApi();

  return {
    sendPrompt(prompt: string) {
      vscode.postMessage({ type: 'PROMPT', payload: prompt });
    },
    onMessage(callback) {
      window.addEventListener('message', (event) => {
        callback(event.data);
      });
    },
  };
}
