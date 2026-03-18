import { amoIdeDispatcher } from './amoIdeDispatcher';
import { extractToolCalls, stripToolCalls, buildIdeSystemPrompt, type IdeContext } from './amoIdePrompt';
import { terminalBridgeService } from './terminalBridgeService';
import { workspaceWriteService } from './workspaceWriteService';

const MAX_ITERATIONS = 6;
const MAX_TOOL_CONTEXT = 3000;

export interface IdeLoopOptions {
  chatId: string;
  userInput: string;
  baseContext: string;
  onPartialReply: (text: string) => void;
  onViewSwitch: (view: string) => void;
  onWebViewUrl: (url: string) => void;
  onPreviewFile: (path: string, content: string) => void;
  onStatus: (status: string) => void;
  generate: (messages: Array<{role: string; content: string}>, systemPrompt: string) => Promise<string>;
  isRequestCanceled: () => boolean;
}

export interface IdeLoopResult {
  finalReply: string;
  filesCreated: string[];
  commandsRun: string[];
  iterations: number;
}

export async function runIdeLoop(options: IdeLoopOptions): Promise<IdeLoopResult> {
  const {
    chatId, userInput, baseContext,
    onPartialReply, onViewSwitch, onWebViewUrl, onPreviewFile,
    onStatus, generate, isRequestCanceled,
  } = options;

  const filesCreated: string[] = [];
  const commandsRun: string[] = [];
  let iterations = 0;
  let consecutiveErrors = 0;

  const ideCtx: IdeContext = {
    cwd: terminalBridgeService.getCwd(chatId) || 'amo-workspace/',
    recentFiles: (await workspaceWriteService.listFiles(chatId)).map(f => f.name),
    lastTerminalOutput: '',
    openFile: undefined,
    openFileContent: undefined,
  };

  const toolResultHistory: string[] = [];

  const messages: Array<{role: string; content: string}> = [
    { role: 'user', content: userInput },
  ];

  let finalReply = '';

  while (iterations < MAX_ITERATIONS) {
    if (isRequestCanceled()) break;
    iterations++;

    // Update context before each iteration
    ideCtx.recentFiles = (await workspaceWriteService.listFiles(chatId)).map(f => f.name);
    ideCtx.cwd = terminalBridgeService.getCwd(chatId) || ideCtx.cwd;

    const ideSystemPrompt = buildIdeSystemPrompt(ideCtx);

    const fullSystem = [
      baseContext,
      '---',
      ideSystemPrompt,
      toolResultHistory.length > 0
        ? `\n[Tool execution history from this session]\n${toolResultHistory.slice(-MAX_TOOL_CONTEXT).join('\n\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    onStatus(`Thinking... (step ${iterations})`);

    try {
      const rawResponse = await generate(messages, fullSystem);

      if (isRequestCanceled()) break;

      const toolCalls = extractToolCalls(rawResponse);
      const displayText = stripToolCalls(rawResponse);

      if (toolCalls.length === 0) {
        finalReply = displayText;
        onPartialReply(displayText);
        break;
      }

      if (displayText.trim()) {
        onPartialReply(displayText + '\n\n_Running tools..._');
      }

      onStatus(`Executing ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''}...`);

      const batch = await amoIdeDispatcher.dispatch(rawResponse, chatId);

      if (isRequestCanceled()) break;

      // Handle view switches and previews
      if (batch.viewSwitch) onViewSwitch(batch.viewSwitch);
      if (batch.webViewUrl) onWebViewUrl(batch.webViewUrl);
      if (batch.previewPath) {
        const content = await readFileForPreview(batch.previewPath, chatId);
        onPreviewFile(batch.previewPath, content);
        ideCtx.openFile = batch.previewPath;
        ideCtx.openFileContent = content;
      }

      // Update context with tool results
      for (const r of batch.results) {
        if (r.toolCall.tool === 'write') {
          filesCreated.push((r.toolCall as any).path);
        }
        if (r.toolCall.tool === 'run') {
          commandsRun.push((r.toolCall as any).command);
          ideCtx.lastTerminalOutput = r.result.slice(0, 400);
          ideCtx.cwd = terminalBridgeService.getCwd(chatId) || ideCtx.cwd;
        }
      }

      toolResultHistory.push(batch.contextBlock);

      // Add tool results to conversation
      messages.push({
        role: 'assistant',
        content: rawResponse,
      });
      messages.push({
        role: 'user',
        content: `[Tool results]\n${batch.contextBlock}\n\nContinue with the task. If complete, give a brief summary of what was done.`,
      });

      // Error handling and loop control
      if (batch.hasErrors) {
        consecutiveErrors++;
        onStatus(`Analyzing errors... (${consecutiveErrors}/${MAX_ITERATIONS})`);
        
        if (consecutiveErrors >= 3) {
          finalReply = 'I encountered multiple errors while trying to complete this task. Please check the error messages above and let me know if you\'d like me to try a different approach.';
          onPartialReply(finalReply);
          break;
        }
        continue;
      } else {
        consecutiveErrors = 0; // Reset error counter on success
      }

      // Check if task is complete (no errors and at least 2 iterations)
      if (!batch.hasErrors && iterations >= 2) {
        // Continue one more iteration to ensure completion
        continue;
      }

    } catch (error) {
      consecutiveErrors++;
      console.error('[IDE Loop] Error in iteration:', iterations, error);
      
      if (consecutiveErrors >= 2) {
        finalReply = `I encountered a technical error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`;
        onPartialReply(finalReply);
        break;
      }
      
      onStatus(`Retrying after error... (${consecutiveErrors})`);
      continue;
    }
  }

  if (!finalReply && toolResultHistory.length > 0) {
    const summaryMessages = [
      ...messages,
      {
        role: 'user',
        content: 'Summarize what you did, what files were created, and whether the task succeeded.',
      },
    ];
    const ideSystemPrompt = buildIdeSystemPrompt(ideCtx);
    const fullSystem = [baseContext, '---', ideSystemPrompt].join('\n\n');
    finalReply = await generate(summaryMessages, fullSystem);
    onPartialReply(finalReply);
  }

  return {
    finalReply: finalReply || 'Task complete.',
    filesCreated,
    commandsRun,
    iterations,
  };
}

async function readFileForPreview(path: string, chatId: string): Promise<string> {
  const result = await terminalBridgeService.run(`cat "${path}"`, chatId);
  return result.success ? result.output : '';
}

export const IDE_TASK_TEMPLATES: Record<string, string> = {
  hello_world_node: `
Create a "Hello World" Node.js app:
1. Write a file amo-workspace/hello.js with console.log("Hello, World!")
2. Run it with node hello.js
3. Open it in the editor for preview
`,
  hello_world_html: `
Create a "Hello World" HTML page:
1. Write amo-workspace/index.html with a complete HTML page showing "Hello, World!" in an h1
2. Open it in the editor for preview
3. Confirm it is ready
`,
  hello_world_python: `
Create a "Hello World" Python script:
1. Write amo-workspace/hello.py with print("Hello, World!")
2. Run it with python3 hello.py
3. Open it in the editor for preview
`,
  npm_project: `
Initialize a new Node.js project:
1. Create directory amo-workspace/my-app
2. Run npm init -y in that directory
3. List the created files
4. Open package.json in the editor
`,
  read_and_explain: `
Read the requested file and explain its contents:
1. Read the file
2. Explain what it does, its structure, and any notable patterns
`,
  list_workspace: `
Show the current workspace:
1. List all files in amo-workspace/
2. Describe what each file is
`,
};

export function matchTaskTemplate(userInput: string): string | null {
  const normalized = userInput.toLowerCase();
  if (/hello.?world.*node|node.*hello.?world/i.test(normalized)) return IDE_TASK_TEMPLATES.hello_world_node;
  if (/hello.?world.*html|html.*hello.?world/i.test(normalized)) return IDE_TASK_TEMPLATES.hello_world_html;
  if (/hello.?world.*python|python.*hello.?world/i.test(normalized)) return IDE_TASK_TEMPLATES.hello_world_python;
  if (/npm.*(init|project|setup)|new.*(node|npm).*(project|app)/i.test(normalized)) return IDE_TASK_TEMPLATES.npm_project;
  if (/list.*(files|workspace|directory)|show.*workspace|what.*files/i.test(normalized)) return IDE_TASK_TEMPLATES.list_workspace;
  return null;
}
