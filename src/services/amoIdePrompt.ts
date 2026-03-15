export interface IdeContext {
  cwd: string;
  recentFiles: string[];
  lastTerminalOutput?: string;
  openFile?: string;
  openFileContent?: string;
}

export const TOOL_CALL_OPEN  = '<<<TOOL>>>';
export const TOOL_CALL_CLOSE = '<<<END>>>';

export type IdeToolCall =
  | { tool: 'run';      command: string; cwd?: string }
  | { tool: 'write';    path: string; content: string }
  | { tool: 'read';    path: string }
  | { tool: 'list';    path?: string }
  | { tool: 'preview'; path: string }
  | { tool: 'search';  query: string }
  | { tool: 'open_url'; url: string };

export function buildIdeSystemPrompt(ctx: IdeContext): string {
  const fileList = ctx.recentFiles.length > 0
    ? ctx.recentFiles.slice(0, 8).join(', ')
    : 'none yet';

  return `
OPERATING MODE: Mobile IDE Agent

You are Amo acting as a full mobile IDE. You have direct access to the device filesystem, terminal, code editor, and browser. You must use these tools to complete tasks — do not just describe what to do.

CURRENT WORKSPACE STATE:
- Working directory: ${ctx.cwd || 'amo-workspace/'}
- Recent files: ${fileList}
${ctx.openFile ? `- File open in editor: ${ctx.openFile}` : ''}
${ctx.lastTerminalOutput ? `- Last terminal output:\n${ctx.lastTerminalOutput}` : ''}

YOUR TOOLS — call them using this exact format:
${TOOL_CALL_OPEN}
{"tool":"<name>", ...params}
${TOOL_CALL_CLOSE}

Available tools:

1. run — execute a shell command
   {"tool":"run","command":"npm run build"}
   {"tool":"run","command":"node index.js","cwd":"amo-workspace/my-project"}

2. write — create or overwrite a file
   {"tool":"write","path":"amo-workspace/hello.js","content":"console.log('Hello world');"}
   - Always use full relative paths from project root

3. read — read a file's content
   {"tool":"read","path":"amo-workspace/package.json"}

4. list — list files in a directory
   {"tool":"list","path":"amo-workspace/"}

5. preview — open a file in the code editor
   {"tool":"preview","path":"amo-workspace/hello.js"}

6. search — search the web
   {"tool":"search","query":"how to use express middleware"}

7. open_url — open a URL in the browser
   {"tool":"open_url","url":"https://nodejs.org/docs"}

AGENTIC WORKFLOW RULES:
1. When given a task, think through the steps briefly then start acting.
2. Use write to create files, run to execute them, read to inspect results.
3. After running, check the output. If it failed, fix the code and run again.
4. After creating a file, always call preview so the user can see it in the editor.
5. If you need information you do not have, use search before writing code.
6. Keep your explanations short — action is more useful than description.
7. When a task is complete, summarize what you did and what files were created.

IMPORTANT:
- Always emit tool calls as valid JSON between ${TOOL_CALL_OPEN} and ${TOOL_CALL_CLOSE}.
- You can emit multiple tool calls in one response — they execute in order.
- Wait for tool results before continuing if the next step depends on them.
- Never pretend to run code — actually run it via the run tool.
- Never pretend to write a file — actually write it via the write tool.
`.trim();
}

export function isIdeIntent(userInput: string): boolean {
  const normalized = userInput.toLowerCase();
  const idePatterns = [
    /\b(create|make|write|build|generate|scaffold)\b.+\b(file|app|project|script|function|class|component|html|css|js|ts|py|java|code)\b/i,
    /\b(run|execute|test|compile|build|start|launch)\b.+\b(this|it|the|my|that|code|script|app|file|project)\b/i,
    /\b(read|open|show|preview|display|view)\b.+\b(file|code|script|content)\b/i,
    /\b(list|show|what)\b.+\b(files?|directory|folder|workspace)\b/i,
    /\b(fix|debug|find the (bug|error|issue)|what.s wrong|why (is|does|isn.t))\b/i,
    /\b(hello world|fizzbuzz|todo app|api|server|express|react|node|python)\b/i,
    /\b(npm|pip|yarn|node|python|java|gcc|make)\b/i,
    /\b(open (in )?(editor|terminal)|show (me )?(the )?(editor|code|file))\b/i,
    /\b(install (dependencies|packages|modules|npm|pip))\b/i,
    /\b(git (init|clone|commit|push|pull|status|log))\b/i,
    /\b(workspace|amo-workspace|project folder)\b/i,
  ];
  return idePatterns.some(p => p.test(normalized));
}

export function extractToolCalls(text: string): IdeToolCall[] {
  const calls: IdeToolCall[] = [];
  const regex = new RegExp(
    `${escapeRegex(TOOL_CALL_OPEN)}\\s*([\\s\\S]*?)\\s*${escapeRegex(TOOL_CALL_CLOSE)}`,
    'g'
  );

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed.tool === 'string') {
        calls.push(parsed as IdeToolCall);
      }
    } catch (e) {
      console.warn('[AmoIDE] Failed to parse tool call:', match[1], e);
    }
  }

  return calls;
}

export function stripToolCalls(text: string): string {
  const regex = new RegExp(
    `${escapeRegex(TOOL_CALL_OPEN)}[\\s\\S]*?${escapeRegex(TOOL_CALL_CLOSE)}`,
    'g'
  );
  return text.replace(regex, '').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatToolResult(call: IdeToolCall, result: string, success: boolean): string {
  const status = success ? 'SUCCESS' : 'FAILED';
  return `[Tool result: ${call.tool} — ${status}]\n${result}`;
}
