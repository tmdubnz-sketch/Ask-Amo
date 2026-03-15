// src/services/terminalBridgeService.ts

export interface TerminalResult {
  command: string;
  output: string;
  exitCode: number;
  cwd: string;
  success: boolean;
  formatted: string;
}

export interface TerminalSession {
  sessionId: string;
  cwd: string;
  history: TerminalResult[];
}

const sessions = new Map<string, TerminalSession>();

function getSession(chatId: string): TerminalSession {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      sessionId: `amo-terminal-${chatId}`,
      cwd: '',
      history: [],
    });
  }
  return sessions.get(chatId)!;
}

function formatResult(result: TerminalResult): string {
  const lines: string[] = [];
  lines.push(`$ ${result.command}`);
  if (result.output.trim()) {
    lines.push(result.output.trim());
  }
  lines.push(`Exit code: ${result.exitCode} | cwd: ${result.cwd}`);
  return lines.join('\n');
}

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\s+\/\b/i,
  /\bformat\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\b:(){ :|:& };:/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
];

function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some(p => p.test(command));
}

export const terminalBridgeService = {

  async run(
    command: string,
    chatId: string,
    options: { timeoutMs?: number; confirmed?: boolean } = {},
  ): Promise<TerminalResult> {
    const { timeoutMs = 20000, confirmed = false } = options;

    if (isDangerous(command) && !confirmed) {
      const result: TerminalResult = {
        command,
        output: `Blocked: "${command}" looks destructive. Ask Amo to confirm before running this.`,
        exitCode: -1,
        cwd: '',
        success: false,
        formatted: '',
      };
      result.formatted = formatResult(result);
      return result;
    }

    const session = getSession(chatId);

    try {
      const response = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          sessionId: session.sessionId,
          cwd: session.cwd || undefined,
          timeoutMs,
        }),
      });

      if (!response.ok) {
        throw new Error(`Terminal API error: ${response.status}`);
      }

      const data = await response.json();

      const result: TerminalResult = {
        command: data.command,
        output: data.output || '',
        exitCode: data.exitCode ?? 0,
        cwd: data.cwd || session.cwd,
        success: data.exitCode === 0,
        formatted: '',
      };
      result.formatted = formatResult(result);

      session.cwd = result.cwd;
      session.history.push(result);

      return result;

    } catch (err) {
      const result: TerminalResult = {
        command,
        output: err instanceof Error ? err.message : 'Terminal request failed.',
        exitCode: -1,
        cwd: session.cwd,
        success: false,
        formatted: '',
      };
      result.formatted = formatResult(result);
      return result;
    }
  },

  async runSequence(
    commands: string[],
    chatId: string,
    options: { stopOnError?: boolean; timeoutMs?: number } = {},
  ): Promise<TerminalResult[]> {
    const { stopOnError = true, timeoutMs = 20000 } = options;
    const results: TerminalResult[] = [];

    for (const command of commands) {
      const result = await this.run(command, chatId, { timeoutMs });
      results.push(result);
      if (stopOnError && !result.success) break;
    }

    return results;
  },

  formatForContext(results: TerminalResult[], maxChars = 2000): string {
    const lines = results.map(r => r.formatted).join('\n---\n');
    if (lines.length <= maxChars) return lines;
    return lines.slice(lines.length - maxChars).trim();
  },

  getSession,

  getCwd(chatId: string): string {
    return getSession(chatId).cwd || 'unknown';
  },

  getHistory(chatId: string): TerminalResult[] {
    return getSession(chatId).history;
  },

  clearSession(chatId: string): void {
    sessions.delete(chatId);
  },
};
