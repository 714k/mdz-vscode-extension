import { createSignal } from 'solid-js';

export const [messages, setMessages] = createSignal<string[]>([]);

export function addMessage(msg: string) {
  setMessages((prev) => [...prev, msg]);
}
