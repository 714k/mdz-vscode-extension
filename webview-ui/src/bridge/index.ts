import { createVSCodeBridge } from './vscodeBridge';
import { createBrowserBridge } from './browserBridge';

export function getBridge() {
  if (typeof acquireVsCodeApi !== 'undefined') {
    return createVSCodeBridge();
  }
  return createBrowserBridge();
}
