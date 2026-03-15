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
  const response = await fetch('/api/terminal/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Terminal request failed.');
  }

  return response.json() as Promise<TerminalExecResult>;
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
      return NativeTerminal.exec(options);
    }

    return execWeb(options);
  },
};
