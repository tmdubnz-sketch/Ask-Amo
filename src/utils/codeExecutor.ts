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

// ── TYPESCRIPT STRIPPER ───────────────────────────────────────────────────────
// Removes TypeScript syntax for browser execution

function stripTypeScript(code: string): string {
  let result = code;
  
  // Remove single-line comments (but not URLs)
  result = result.replace(/\/\/(?!https?:).*/gm, '');
  
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove interface declarations
  result = result.replace(/\binterface\s+\w+\s*\{[^}]*\}/g, '');
  
  // Remove type declarations
  result = result.replace(/\btype\s+\w+\s*=\s*[^;]+;/g, '');
  
  // Remove import type statements
  result = result.replace(/\bimport\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*;?/g, '');
  result = result.replace(/\bimport\s+type\s+\w+\s+from\s+['"][^'"]+['"]\s*;?/g, '');
  
  // Remove enum declarations
  result = result.replace(/\benum\s+\w+\s*\{[^}]*\}/g, '');
  
  // Remove type annotations from parameters: (param: Type) -> (param)
  result = result.replace(/(\w+)\s*:\s*\w+(\[\])?(\s*[=,)\]])/g, '$1$3');
  
  // Remove return type annotations: ): Type -> )
  result = result.replace(/\)\s*:\s*\w+(\[\])?(\s*\{)/g, ')$2');
  
  // Remove type assertions: as Type
  result = result.replace(/\s+as\s+\w+/g, '');
  
  // Remove generic type parameters: <Type>
  result = result.replace(/<\w+(\s*,\s*\w+)*>/g, '');
  
  // Remove optional chaining with types: param?: Type -> param
  result = result.replace(/(\w+)\?\s*:\s*\w+/g, '$1');
  
  // Remove readonly modifier
  result = result.replace(/\breadonly\s+/g, '');
  
  // Remove access modifiers
  result = result.replace(/\b(public|private|protected)\s+/g, '');
  
  // Remove abstract modifier
  result = result.replace(/\babstract\s+/g, '');
  
  // Remove declare keyword
  result = result.replace(/\bdeclare\s+/g, '');
  
  // Remove implements clause
  result = result.replace(/\bimplements\s+\w+(\s*,\s*\w+)*/g, '');
  
  // Remove extends with type parameters
  result = result.replace(/\bextends\s+\w+<[^>]+>/g, (match) => {
    const className = match.match(/extends\s+(\w+)/);
    return className ? `extends ${className[1]}` : '';
  });
  
  return result.trim();
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
    
    // Signal ready and set flag on parent frame
    send('ready', null);
    window.parent.postMessage({ type: 'amo-frame-ready' }, '*');
  <\/script></head><body></body></html>`;

  // Listen for frame-ready confirmation
  window.addEventListener('message', function onReady(e) {
    if (e.data?.type === 'amo-frame-ready') {
      (execFrame as any)._ready = true;
      window.removeEventListener('message', onReady);
    }
  });

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
    let isReady = false;
    
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
        case 'ready':
          isReady = true;
          // Now send the code
          frame.contentWindow?.postMessage({ type: 'amo-run', code }, '*');
          break;
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

    // If frame already ready, send immediately
    if ((frame as any)._ready) {
      frame.contentWindow?.postMessage({ type: 'amo-run', code }, '*');
    }
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

export async function executeJson(code: string): Promise<ExecutionResult> {
  try {
    const parsed = JSON.parse(code);
    return {
      success: true,
      output: JSON.stringify(parsed, null, 2),
      method: 'sandbox',
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON',
      method: 'sandbox',
    };
  }
}

export async function executeMarkup(code: string, language: string): Promise<ExecutionResult> {
  return {
    success: true,
    output: `${language.toUpperCase()} is display-oriented. Use Preview to render it, or Save to keep it in the workspace.`,
    method: 'sandbox',
  };
}

// ── UNIFIED EXECUTOR ──────────────────────────────────────────────────────────

export type Language = 'javascript' | 'typescript' | 'python' | 'shell' | string;

export async function executeCode(code: string, language: Language): Promise<ExecutionResult> {
  const lang = language.toLowerCase();

  switch (lang) {
    case 'javascript':
    case 'js':
      return executeJavaScript(code);

    case 'typescript':
    case 'ts':
      // Strip TypeScript syntax for browser execution
      return executeJavaScript(stripTypeScript(code));

    case 'python':
    case 'py':
      return executePython(code);

    case 'shell':
    case 'bash':
    case 'sh':
      return executeShell(code);

    case 'json':
      return executeJson(code);

    case 'html':
    case 'css':
    case 'markdown':
    case 'md':
      return executeMarkup(code, lang);

    default:
      return {
        success: false,
        output: '',
        error: `Language '${language}' is not supported.\nSupported: JavaScript, TypeScript, Python, Shell, JSON, HTML, CSS, Markdown`,
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
