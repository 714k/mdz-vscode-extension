import {
  Component,
  createSignal,
  onMount,
  For,
  Show,
  createEffect,
} from 'solid-js';
import { wsClient, wsConnected, wsStatus } from './services/websocket';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  model?: string;
  requestId?: string;
}

interface ContextChip {
  id: string;
  type: 'file' | 'folder' | 'symbol' | 'selection';
  label: string;
}

const App: Component = () => {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [inputValue, setInputValue] = createSignal('');
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [contextChips, setContextChips] = createSignal<ContextChip[]>([]);
  const [currentModel, setCurrentModel] = createSignal('claude-sonnet-4');

  let messagesEndRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  onMount(() => {
    wsClient.on('chat.response', (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          type: 'ai',
          content: data.content,
          timestamp: new Date(),
          model: data.model,
          requestId: data.request_id,
        },
      ]);
      setIsProcessing(false);
      scrollToBottom();
    });

    wsClient.on('status', (data: any) => {
      if (data.status === 'processing') {
        setIsProcessing(true);
      } else {
        setIsProcessing(false);
      }
    });

    wsClient.on('error', (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          type: 'ai',
          content: `Error: ${data.error || 'An error occurred'}`,
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
    });

    wsClient.on('context.updated', (data: any) => {
      const chips: ContextChip[] = Object.keys(data).map((key) => {
        const [type, ...labelParts] = key.split(':');
        return {
          id: key,
          type: type as any,
          label: labelParts.join(':'),
        };
      });
      setContextChips(chips);
    });

    wsClient.connect();
  });

  createEffect(() => {
    if (inputRef) {
      inputRef.style.height = 'auto';
      inputRef.style.height = Math.min(inputRef.scrollHeight, 100) + 'px';
    }
  });

  const sendMessage = () => {
    const content = inputValue().trim();
    if (!content || !wsConnected()) return;

    const messageId = `user_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        type: 'user',
        content,
        timestamp: new Date(),
      },
    ]);

    wsClient.sendMessage(content, {
      model: currentModel(),
    });

    setInputValue('');
    setIsProcessing(true);
    scrollToBottom();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const addContextFile = () => wsClient.addContext('file').catch(console.error);
  const addContextSelection = () =>
    wsClient.addContext('selection').catch(console.error);
  const addContextFolder = () =>
    wsClient.addContext('folder').catch(console.error);
  const addContextSymbol = () =>
    wsClient.addContext('symbol').catch(console.error);

  const removeContextChip = (id: string) => {
    wsClient.removeContext(id);
    setContextChips((prev) => prev.filter((chip) => chip.id !== id));
  };

  const getChipClass = (type: string) => {
    const baseClass = 'context-chip';
    return `${baseClass} ${baseClass}--${type}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div class="app">
      <div class="topbar">
        <div class="logo">
          <div class="logo-mark">⚡</div>
          <span class="logo-text">mdz</span>
        </div>
        <div class="status">
          <span
            class={`status-dot ${wsConnected() ? 'connected' : 'disconnected'}`}
          />
          <span class="status-text">{wsStatus()}</span>
        </div>
      </div>

      <Show when={contextChips().length >= 0}>
        <div class="context-bar">
          <div class="context-label">Active Context</div>
          <div class="context-chips">
            <For each={contextChips()}>
              {(chip) => (
                <div class={getChipClass(chip.type)}>
                  <span class="chip-icon">
                    {chip.type === 'file' && '📄'}
                    {chip.type === 'folder' && '📁'}
                    {chip.type === 'symbol' && '🔷'}
                    {chip.type === 'selection' && '✂️'}
                  </span>
                  <span class="chip-label">{chip.label}</span>
                  <button
                    class="chip-remove"
                    onClick={() => removeContextChip(chip.id)}
                  >
                    ×
                  </button>
                </div>
              )}
            </For>
            <div class="context-actions">
              <button
                class="context-add-btn"
                onClick={addContextFile}
                title="Add file"
              >
                📄+
              </button>
              <button
                class="context-add-btn"
                onClick={addContextSelection}
                title="Add selection"
              >
                ✂️+
              </button>
              <button
                class="context-add-btn"
                onClick={addContextFolder}
                title="Add folder"
              >
                📁+
              </button>
              <button
                class="context-add-btn"
                onClick={addContextSymbol}
                title="Add symbol"
              >
                🔷+
              </button>
            </div>
          </div>
        </div>
      </Show>

      <div class="messages-container">
        <div class="messages">
          <Show when={messages().length === 0}>
            <div class="empty-state">
              <div class="empty-icon">💬</div>
              <h3>Start a conversation</h3>
              <p>Ask me anything about your code</p>
            </div>
          </Show>

          <For each={messages()}>
            {(msg) => (
              <div class={`message message--${msg.type}`}>
                <div class="message-avatar">
                  {msg.type === 'ai' ? '🤖' : '👤'}
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-sender">
                      {msg.type === 'ai' ? 'AI' : 'You'}
                    </span>
                    <Show when={msg.model}>
                      <span class="message-model">{msg.model}</span>
                    </Show>
                    <span class="message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div class="message-text">{msg.content}</div>
                </div>
              </div>
            )}
          </For>

          <Show when={isProcessing()}>
            <div class="message message--ai">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <div class="thinking-indicator">
                  <span class="thinking-dot"></span>
                  <span class="thinking-dot"></span>
                  <span class="thinking-dot"></span>
                </div>
              </div>
            </div>
          </Show>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div class="input-area">
        <div class="input-wrapper">
          <textarea
            ref={inputRef}
            class="input-field"
            value={inputValue()}
            onInput={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI..."
            disabled={!wsConnected()}
            rows="1"
          />
          <button
            class="send-button"
            onClick={sendMessage}
            disabled={!wsConnected() || isProcessing() || !inputValue().trim()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div class="input-footer">
          <select
            class="model-selector"
            value={currentModel()}
            onChange={(e) => setCurrentModel(e.currentTarget.value)}
          >
            <option value="claude-sonnet-4">Claude Sonnet 4</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gemini-pro">Gemini Pro</option>
          </select>
          <span class="token-info">Ready</span>
        </div>
      </div>
    </div>
  );
};

export default App;
