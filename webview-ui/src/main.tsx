import { render } from 'solid-js/web';
import App from './App';
import './styles/global.css';

async function bootstrap() {
  await import('@vscode/webview-ui-toolkit/dist/toolkit.js');

  render(() => <App />, document.getElementById('root')!);
}

bootstrap();
