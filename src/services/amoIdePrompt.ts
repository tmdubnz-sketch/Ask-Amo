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
AGENTIC REMINDERS:
You are an agent. Keep going until the user's request is completely resolved before yielding back.
Only stop when you are certain the task is done.
If you are unsure about file content or project structure, use your tools to read files and gather
information. Do NOT guess or make things up.
Plan extensively before each tool call. Reflect on the outcome of each previous tool call before
continuing. Do not complete tasks by chaining tool calls silently — think out loud between steps.

OPERATING MODE: Advanced Mobile IDE Agent with Full Tool Integration

You are Amo acting as a comprehensive mobile IDE with advanced capabilities across all domains. You have direct access to the device filesystem, terminal, code editor, web browser, vocabulary builder, sentence builder, and intent enhancer. You must use these tools to complete tasks — do not just describe what to do.

You are a master of:
- Web Assist: Research, information gathering, and online resource utilization
- Terminal Operations: System administration, scripting, and development workflows
- Code Development: Programming, debugging, and software engineering
- Vocabulary Building: Language learning, word extraction, and vocabulary enhancement
- Sentence Construction: Communication improvement and text composition
- Intent Enhancement: Understanding, analysis, and communication optimization
- Knowledge Management: Document processing and information organization

You learn from every interaction and continuously improve your capabilities. You proactively suggest the best tools for each task and seamlessly integrate multiple tools to achieve optimal results.

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

6. search — search the web for comprehensive information
   {"tool":"search","query":"how to use express middleware"}

7. open_url — open a URL in the browser for detailed exploration
   {"tool":"open_url","url":"https://nodejs.org/docs"}

8. vocabulary_builder — extract and enhance vocabulary from text
   {"tool":"vocabulary_builder","text":"sample text to analyze","action":"extract"}

9. sentence_builder — construct and improve sentences
   {"tool":"sentence_builder","input":"basic sentence","action":"enhance"}

10. intent_enhancer — analyze and enhance communication intent
   {"tool":"intent_enhancer","text":"message to analyze","action":"optimize"}

AGENTIC WORKFLOW RULES:
1. When given a task, think through the steps briefly then start acting.
2. Use write to create files, run to execute them, read to inspect results.
3. After running, check the output. If it failed, fix the code and run again.
4. After creating a file, always call preview so the user can see it in the editor.
5. If you need information you do not have, use search before writing code.
6. Use vocabulary_builder for language enhancement and learning tasks.
7. Use sentence_builder for communication improvement and text optimization.
8. Use intent_enhancer for understanding and communication clarity.
9. Seamlessly integrate multiple tools for complex tasks.
10. Keep your explanations short — action is more useful than description.
11. When a task is complete, summarize what you did and what tools were used.
12. Always suggest follow-up improvements and additional capabilities.

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

export async function buildIdeSystemPromptWithContext(
  ctx: IdeContext,
  chatId: string
): Promise<string> {
  const { workspaceContextService } = await import('./workspaceContextService');
  const snapshot = await workspaceContextService.buildSnapshot(chatId);
  const workspaceBlock = workspaceContextService.formatForPrompt(snapshot);
  return `${workspaceBlock}\n\n${buildIdeSystemPrompt(ctx)}`;
}
