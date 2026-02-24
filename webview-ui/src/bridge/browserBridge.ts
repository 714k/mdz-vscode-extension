import { ExtensionBridge } from './types';

export function createBrowserBridge(): ExtensionBridge {
  return {
    sendPrompt(prompt: string) {
      console.log('Mock prompt:', prompt);
    },
    onMessage(callback) {
      console.log('Mock message listener registered');
    },
  };
}
