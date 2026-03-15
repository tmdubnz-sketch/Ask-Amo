import { newAsyncRuntime, QuickJSAsyncRuntime, QuickJSAsyncContext } from 'quickjs-emscripten';
import { loadPyodide, PyodideInterface } from 'pyodide';

let runtime: QuickJSAsyncRuntime | null = null;
let context: QuickJSAsyncContext | null = null;
let pyodide: PyodideInterface | null = null;

export interface RunResult {
  output: string[];
  error?: string;
}

async function getContext(): Promise<QuickJSAsyncContext> {
  if (!runtime) {
    runtime = await newAsyncRuntime();
  }
  if (!context) {
    context = runtime.newContext();
  }
  return context;
}

export async function runCode(code: string): Promise<RunResult> {
  const ctx = await getContext();
  const output: string[] = [];

  try {
    const result = await ctx.evalCode(code);
    if (result.error) {
      const errorMsg = result.error.consume((v: unknown) => String(v));
      return { output, error: errorMsg };
    }
    if (result.value) {
      const valueStr = result.value.consume((v: unknown) => {
        if (v === undefined) return 'undefined';
        if (v === null) return 'null';
        if (typeof v === 'object') {
          try { return JSON.stringify(v, null, 2); }
          catch { return String(v); }
        }
        return String(v);
      });
      output.push(`→ ${valueStr}`);
    }
    return { output };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { output, error: errorMsg };
  }
}

export async function initPyodide(): Promise<PyodideInterface> {
  if (!pyodide) {
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/',
    });
    await pyodide.loadPackage(['numpy', 'pandas']);
  }
  return pyodide;
}

export async function runPython(code: string): Promise<RunResult> {
  const output: string[] = [];
  
  try {
    const py = await initPyodide();
    
    py.setStdout({ batched: (msg: string) => output.push(msg) });
    py.setStderr({ batched: (msg: string) => output.push(`ERR: ${msg}`) });
    
    await py.runPythonAsync(code);
    
    return { output };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { output, error: errorMsg };
  }
}

export function disposeQuickJS(): void {
  if (context) {
    context.dispose();
    context = null;
  }
  if (runtime) {
    runtime.dispose();
    runtime = null;
  }
}

export function disposePyodide(): void {
  pyodide = null;
}
