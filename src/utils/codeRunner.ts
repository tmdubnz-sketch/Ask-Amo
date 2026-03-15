import { newAsyncRuntime, QuickJSAsyncRuntime, QuickJSAsyncContext } from 'quickjs-emscripten';

let runtime: QuickJSAsyncRuntime | null = null;
let context: QuickJSAsyncContext | null = null;

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
