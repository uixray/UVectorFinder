import { SandboxToUIMessage } from '../types';

export function sendToUI(msg: SandboxToUIMessage): void {
  figma.ui.postMessage(msg);
}
