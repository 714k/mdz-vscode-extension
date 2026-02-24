import * as vscode from 'vscode';
import axios from 'axios';

export class AuthService {
  private static readonly API_URL = 'http://localhost:8000/api/v1';
  private token: string | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.token = this.context.globalState.get('authToken');
  }

  async login(): Promise<void> {
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your email',
      placeHolder: 'user@example.com',
    });

    if (!email) {
      return;
    }

    const password = await vscode.window.showInputBox({
      prompt: 'Enter your password',
      password: true,
    });

    if (!password) {
      return;
    }

    try {
      const response = await axios.post(`${AuthService.API_URL}/auth/login`, {
        email,
        password,
      });

      this.token = response.data.access_token;
      await this.context.globalState.update('authToken', this.token);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      throw error;
    }
  }

  async register(): Promise<void> {
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your email',
      placeHolder: 'user@example.com',
    });

    if (!email) {
      return;
    }

    const password = await vscode.window.showInputBox({
      prompt: 'Create a password (min 8 characters)',
      password: true,
    });

    if (!password) {
      return;
    }

    try {
      await axios.post(`${AuthService.API_URL}/auth/register`, {
        email,
        password,
      });

      await this.login();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Registration failed: ${error.message}`);
      throw error;
    }
  }

  getToken(): string | undefined {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async logout(): Promise<void> {
    this.token = undefined;
    await this.context.globalState.update('authToken', undefined);
  }
}
