import { Capacitor, registerPlugin } from '@capacitor/core';

export interface TerminalExecResult {
  command: string;
  output: string;
  exitCode: number;
  cwd: string;
  sessionId: string;
}

interface NativeTerminalPlugin {
  exec(options: {
    command: string;
    sessionId: string;
    cwd?: string;
    timeoutMs?: number;
  }): Promise<TerminalExecResult>;
}

const NativeTerminal = registerPlugin<NativeTerminalPlugin>('NativeTerminal');

async function execWeb(options: {
  command: string;
  sessionId: string;
  cwd?: string;
  timeoutMs?: number;
}): Promise<TerminalExecResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);
  
  try {
    const response = await fetch('/api/terminal/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const message = await response.text();
      if (response.status === 408) {
        throw new Error('Terminal command timed out. Try a shorter command or increase timeout.');
      }
      if (response.status >= 500) {
        throw new Error('Terminal service is temporarily unavailable. Please try again.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid command: ${message || 'Check command syntax and parameters.'}`);
      }
      throw new Error(message || 'Terminal request failed.');
    }

    return response.json() as Promise<TerminalExecResult>;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Terminal command timed out. Try a shorter command or increase timeout.');
    }
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error('Network error: Cannot connect to terminal service. Check your connection.');
    }
    throw error;
  }
}

export const terminalService = {
  isAvailable(): boolean {
    return true;
  },

  async exec(options: {
    command: string;
    sessionId: string;
    cwd?: string;
    timeoutMs?: number;
  }): Promise<TerminalExecResult> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await NativeTerminal.exec(options);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            throw new Error('Native terminal command timed out. Try a shorter command.');
          }
          if (error.message.includes('permission')) {
            throw new Error('Terminal permission denied. Check app permissions.');
          }
          throw new Error(`Native terminal error: ${error.message}`);
        }
        throw new Error('Native terminal failed with unknown error.');
      }
    }

    return execWeb(options);
  },
};
