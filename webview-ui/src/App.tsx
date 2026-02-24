import { Component, createSignal, onMount, Show } from 'solid-js';
import { wsClient, wsConnected, wsStatus } from './services/websocket';

const API_URL = '/api/v1';
const isDevMode = typeof (window as any).postMessageToExtension !== 'function';

const App: Component = () => {
  const [messages, setMessages] = createSignal<any[]>([]);
  const [inputValue, setInputValue] = createSignal('');
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loginError, setLoginError] = createSignal('');
  const [loginLoading, setLoginLoading] = createSignal(false);

  onMount(() => {
    wsClient.on('chat.response', (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          content: data.content,
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
    });

    wsClient.on('status', (data: any) => {
      if (data?.status === 'processing') {
        setIsProcessing(true);
      } else {
        setIsProcessing(false);
      }
    });

    wsClient.on('error', () => {
      setIsProcessing(false);
    });

    // In VSCode, connect immediately via the extension bridge.
    // In dev mode, wait for the user to log in.
    if (!isDevMode) {
      wsClient.connect();
    } else {
      // Try to reconnect with a stored token on reload.
      const stored = localStorage.getItem('mdz_dev_token');
      if (stored) {
        wsClient.connect(stored);
      }
    }
  });

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email(), password: password() }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail ?? `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      wsClient.connect(data.access_token);
    } catch (e: any) {
      setLoginError(e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const sendMessage = () => {
    const content = inputValue().trim();
    if (!content || !wsConnected()) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        type: 'user',
        content,
        timestamp: new Date(),
      },
    ]);

    wsClient.sendMessage(content);
    setInputValue('');
    setIsProcessing(true);
  };

  return (
    <div class="app">
      <div class="status-bar">
        <span
          class={`status-indicator ${wsConnected() ? 'connected' : 'disconnected'}`}
        >
          {wsStatus()}
        </span>
      </div>

      <Show when={isDevMode && !wsConnected()}>
        <div class="dev-login">
          <p>Dev mode — login to connect</p>
          <input
            type="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Email"
          />
          <input
            type="password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
          />
          <button onClick={handleLogin} disabled={loginLoading()}>
            {loginLoading() ? 'Connecting…' : 'Login & Connect'}
          </button>
          <Show when={loginError()}>
            <p class="login-error">{loginError()}</p>
          </Show>
        </div>
      </Show>

      <div class="messages">
        {messages().map((msg) => (
          <div class={`message ${msg.type}`}>
            <div class="message-content">{msg.content}</div>
          </div>
        ))}

        <Show when={isProcessing()}>
          <div class="message ai">
            <div class="thinking">Thinking...</div>
          </div>
        </Show>
      </div>

      <div class="input-area">
        <input
          id="message"
          type="text"
          value={inputValue()}
          onInput={(e) => setInputValue(e.currentTarget.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button id="send-btn" onClick={sendMessage} disabled={isProcessing()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default App;
