// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNIFIED CODE EXECUTOR
// Handles code execution across all platforms (Web, Android, iOS)
// Uses iframe sandbox for JS, Pyodide for Python, terminal for shell
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Capacitor } from '@capacitor/core';
import { terminalService } from '../services/terminalService';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  method: 'iframe' | 'pyodide' | 'terminal' | 'sandbox';
}

// ── IFRAME-BASED JS EXECUTION ─────────────────────────────────────────────────
// Creates a hidden iframe, injects code, and captures console output.
// Works on ALL platforms including Android WebView.

let execFrame: HTMLIFrameElement | null = null;
let execCallback: ((result: ExecutionResult) => void) | null = null;

function ensureFrame(): HTMLIFrameElement {
  if (execFrame) return execFrame;

  execFrame = document.createElement('iframe');
  execFrame.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
  execFrame.sandbox.add('allow-scripts');
  execFrame.srcdoc = `<!DOCTYPE html><html><head><script>
    // Capture console output
    const __logs = [];
    const __origConsole = { log: console.log, error: console.error, warn: console.warn, info: console.info };
    
    function send(type, data) {
      window.parent.postMessage({ type: 'amo-exec', payload: { type, data } }, '*');
    }
    
    console.log = (...args) => { __origConsole.log(...args); send('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); };
    console.error = (...args) => { __origConsole.error(...args); send('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); };
    console.warn = (...args) => { __origConsole.warn(...args); send('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); };
    console.info = (...args) => { __origConsole.info(...args); send('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); };
    
    // Listen for code execution requests
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'amo-run') {
        try {
          const result = eval(e.data.code);
          if (result !== undefined) {
            send('result', typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
          }
          send('done', null);
        } catch(err) {
          send('error', err.message);
          send('done', null);
        }
      }
    });
    
    // Signal ready
    send('ready', null);
  <\/script></head><body></body></html>`;

  document.body.appendChild(execFrame);

  return execFrame;
}

function setupMessageHandler() {
  window.addEventListener('message', (e) => {
    if (e.data?.type !== 'amo-exec') return;
    const { type, data } = e.data.payload;
    
    if (!execCallback) return;
    
    switch (type) {
      case 'ready':
        break;
      case 'log':
      case 'info':
        execCallback({ success: true, output: data, method: 'iframe' });
        break;
      case 'warn':
        execCallback({ success: true, output: `[warn] ${data}`, method: 'iframe' });
        break;
      case 'error':
        execCallback({ success: false, output: '', error: data, method: 'iframe' });
        break;
      case 'result':
        execCallback({ success: true, output: `→ ${data}`, method: 'iframe' });
        break;
      case 'done':
        // Signal completion
        execCallback({ success: true, output: '', method: 'iframe' });
        execCallback = null;
        break;
    }
  });
}

// Initialize message handler
setupMessageHandler();

// ── JAVASCRIPT EXECUTION ──────────────────────────────────────────────────────

export async function executeJavaScript(code: string): Promise<ExecutionResult> {
  const outputs: string[] = [];
  let error: string | undefined;

  return new Promise((resolve) => {
    const frame = ensureFrame();
    let completed = false;
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        resolve({
          success: false,
          output: outputs.join('\n'),
          error: 'Execution timed out (10s limit)',
          method: 'iframe',
        });
      }
    }, 10000);

    // Capture output from iframe
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'amo-exec') return;
      const { type, data } = e.data.payload;

      switch (type) {
        case 'log':
        case 'info':
          outputs.push(data);
          break;
        case 'warn':
          outputs.push(`[warn] ${data}`);
          break;
        case 'error':
          error = data;
          outputs.push(`ERR: ${data}`);
          break;
        case 'result':
          outputs.push(`→ ${data}`);
          break;
        case 'done':
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          if (!completed) {
            completed = true;
            resolve({
              success: !error,
              output: outputs.join('\n') || 'Done.',
              error,
              method: 'iframe',
            });
          }
          break;
      }
    };

    window.addEventListener('message', handler);

    // Send code to iframe
    frame.contentWindow?.postMessage({ type: 'amo-run', code }, '*');
  });
}

// ── PYTHON EXECUTION ──────────────────────────────────────────────────────────

import { loadPyodide, PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;
let pyodideLoading = false;

export async function executePython(code: string): Promise<ExecutionResult> {
  const outputs: string[] = [];

  try {
    // Lazy load Pyodide
    if (!pyodide && !pyodideLoading) {
      pyodideLoading = true;
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/',
      });
      pyodideLoading = false;
    }

    if (!pyodide) {
      return { success: false, output: '', error: 'Pyodide failed to load', method: 'pyodide' };
    }

    pyodide.setStdout({ batched: (msg: string) => outputs.push(msg) });
    pyodide.setStderr({ batched: (msg: string) => outputs.push(`ERR: ${msg}`) });

    await pyodide.runPythonAsync(code);

    return {
      success: true,
      output: outputs.join('\n') || 'Done.',
      method: 'pyodide',
    };
  } catch (err) {
    return {
      success: false,
      output: outputs.join('\n'),
      error: err instanceof Error ? err.message : String(err),
      method: 'pyodide',
    };
  }
}

// ── SHELL EXECUTION ───────────────────────────────────────────────────────────

export async function executeShell(code: string): Promise<ExecutionResult> {
  try {
    const result = await terminalService.exec({
      command: code,
      sessionId: 'code-exec',
      timeoutMs: 30000,
    });

    return {
      success: result.exitCode === 0,
      output: result.output || 'Done.',
      error: result.exitCode !== 0 ? `Exit code: ${result.exitCode}` : undefined,
      method: 'terminal',
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err instanceof Error ? err.message : String(err),
      method: 'terminal',
    };
  }
}

// ── UNIFIED EXECUTOR ──────────────────────────────────────────────────────────

export type Language = 'javascript' | 'typescript' | 'python' | 'shell' | string;

export async function executeCode(code: string, language: Language): Promise<ExecutionResult> {
  const lang = language.toLowerCase();

  switch (lang) {
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
      return executeJavaScript(code);

    case 'python':
    case 'py':
      return executePython(code);

    case 'shell':
    case 'bash':
    case 'sh':
      return executeShell(code);

    default:
      return {
        success: false,
        output: '',
        error: `Language '${language}' is not supported.\nSupported: JavaScript, TypeScript, Python, Shell`,
        method: 'sandbox',
      };
  }
}

// ── CLEANUP ───────────────────────────────────────────────────────────────────

export function cleanup(): void {
  if (execFrame) {
    execFrame.remove();
    execFrame = null;
  }
}
