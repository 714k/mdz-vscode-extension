import { createSignal, Component } from 'solid-js';
import { getBridge } from '../../bridge';
import { addMessage, messages } from './chatStore';
import styles from './ChatView.module.css';

export default function ChatView() {
  const [input, setInput] = createSignal('');
  const bridge = getBridge();

  const handleChange = (event: Event) => {};

  function send() {
    addMessage(input());
    bridge.sendPrompt(input());
    setInput('');
  }

  return (
    <>
      <div class="messages">
        {messages().map((msg) => (
          <div>{msg}</div>
        ))}
      </div>

      <div class={styles['prompt-container']}>
        <textarea
          value={input()}
          onInput={(e: any) => setInput(e.target.value)}
          placeholder="Whats on your mind?"
        ></textarea>
        <div class="action-footer">
          <vscode-dropdown value="" onChange={handleChange}></vscode-dropdown>
          <vscode-button onclick={send}>Send</vscode-button>
        </div>
      </div>
    </>
  );
}
