import { terminalBridgeService } from './terminalBridgeService';

export interface FileContextResult {
  enhancedPrompt: string;
  filesIncluded: string[];
}

export async function injectFileContext(prompt: string, chatId = 'default'): Promise<FileContextResult> {
  const filesIncluded: string[] = [];
  let enhancedPrompt = prompt;

  // Match @file:path patterns
  const fileRegex = /@file:([^\s]+)/g;
  let match;
  const fileMatches: string[] = [];

  while ((match = fileRegex.exec(prompt)) !== null) {
    fileMatches.push(match[1]);
  }

  for (const filePath of fileMatches) {
    try {
      const result = await terminalBridgeService.run(`cat "${filePath}"`, chatId);
      
      if (result.success && result.output) {
        const truncated = truncateContent(result.output, 4000);
        filesIncluded.push(filePath);
        
        enhancedPrompt = enhancedPrompt.replace(
          `@file:${filePath}`,
          `\n[File: ${filePath}]\n\`\`\`\n${truncated}\n\`\`\``
        );
      } else {
        enhancedPrompt = enhancedPrompt.replace(
          `@file:${filePath}`,
          `\n[Error: Could not load ${filePath}]`
        );
      }
    } catch {
      enhancedPrompt = enhancedPrompt.replace(
        `@file:${filePath}`,
        `\n[Error: Could not load ${filePath}]`
      );
    }
  }

  // Handle @workspace - inject workspace summary
  if (prompt.includes('@workspace')) {
    const snapshot = await terminalBridgeService.run('find . -maxdepth 2 -type f 2>/dev/null | head -20', chatId);
    const gitStatus = await terminalBridgeService.run('git status --short 2>/dev/null || echo ""', chatId);
    
    const workspaceBlock = `[Workspace Context]
Files: ${snapshot.success ? snapshot.output.split('\n').filter(Boolean).join(', ') : 'N/A'}
Git: ${gitStatus.success ? gitStatus.output.trim() || 'not a git repo' : 'N/A'}`;

    enhancedPrompt = enhancedPrompt.replace(
      '@workspace',
      `\n${workspaceBlock}`
    );
    filesIncluded.push('[workspace]');
  }

  return { enhancedPrompt, filesIncluded };
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + `\n\n[... truncated ${content.length - maxLength} characters]`;
}
