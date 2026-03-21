import { Capacitor } from '@capacitor/core';
import { terminalService } from './terminalService';
import { vectorDbService } from './vectorDbService';

// Use app-accessible storage — /data/local/tmp requires root on Android
const getWorkspacePath = (): string => {
  if (Capacitor.isNativePlatform()) {
    return '/storage/emulated/0/Documents/AskAmo';
  }
  return './amo-workspace';
};

export interface FileOperationResult {
  success: boolean;
  path?: string;
  output?: string;
  error?: string;
}

export interface WorkspaceFile {
  name: string;
  size: number;
}

export const workspaceWriteService = {
  async ensureWorkspace(): Promise<boolean> {
    const workspacePath = getWorkspacePath();
    try {
      const result = await terminalService.exec({
        command: `mkdir -p "${workspacePath}"`,
        sessionId: 'workspace-init',
      });
      return result.exitCode === 0;
    } catch (err) {
      console.warn('[Workspace] Failed to create workspace:', err);
      return false;
    }
  },

  async writeFile(filename: string, content: string): Promise<FileOperationResult> {
    const workspacePath = getWorkspacePath();
    
    // Preserve directory structure and dotfiles — only sanitize dangerous characters
    const safeName = filename
      .replace(/\.\./g, '.')           // prevent path traversal
      .replace(/[;&|`$(){}]/g, '_');   // remove shell metacharacters
    const path = `${workspacePath}/${safeName}`;
    
    // Create parent directories if path contains subdirectories
    const dirPart = safeName.includes('/') ? safeName.substring(0, safeName.lastIndexOf('/')) : '';
    if (dirPart) {
      await terminalService.exec({
        command: `mkdir -p "${workspacePath}/${dirPart}"`,
        sessionId: 'workspace-write',
        timeoutMs: 5000,
      });
    }

    const cmd = `cat > '${path}' << 'EOFAMO'\n${content}\nEOFAMO`;

    try {
      const result = await terminalService.exec({
        command: cmd,
        sessionId: 'workspace-write',
      });

      if (result.exitCode !== 0) {
        return { success: false, error: result.output };
      }

      return { success: true, path, output: result.output };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  },

  async readFile(filename: string): Promise<string | null> {
    const workspacePath = getWorkspacePath();
    const safeName = filename
      .replace(/\.\./g, '.')
      .replace(/[;&|`$(){}]/g, '_');
    const path = `${workspacePath}/${safeName}`;

    try {
      const result = await terminalService.exec({
        command: `cat "${path}"`,
        sessionId: 'workspace-read',
        timeoutMs: 5000,
      });

      if (result.exitCode !== 0) {
        console.warn('[Workspace] Read failed:', result.output);
        return null;
      }

      return result.output;
    } catch (err) {
      console.warn('[Workspace] Read error:', err);
      return null;
    }
  },

  async listFiles(_chatId?: string): Promise<WorkspaceFile[]> {
    const workspacePath = getWorkspacePath();
    try {
      const result = await terminalService.exec({
        command: `ls -la "${workspacePath}"`,
        sessionId: 'workspace-list',
      });

      if (result.exitCode !== 0) {
        return [];
      }

      const lines = result.output.split('\n').slice(1);
      return lines
        .map(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 9) return null;
          const size = parseInt(parts[4], 10);
          const name = parts.slice(8).join(' ');
          if (!name || name === '.' || name === '..') return null;
          return { name, size: isNaN(size) ? 0 : size };
        })
        .filter((f): f is WorkspaceFile => f !== null);
    } catch (err) {
      console.warn('[Workspace] List failed:', err);
      return [];
    }
  },

  async importToKnowledge(filename: string): Promise<boolean> {
    const content = await this.readFile(filename);
    if (!content) return false;

    try {
      const safeName = filename
        .replace(/\.\./g, '.')
        .replace(/[;&|`$(){}]/g, '_');
      await vectorDbService.addDocument({
        id: `workspace:${safeName}`,
        documentId: `workspace:${safeName}`,
        documentName: `File: ${filename}`,
        content: `[File: ${filename}]\n\n${content}`,
        metadata: { assetKind: 'document', source: 'workspace', importedAt: Date.now() },
      });
      return true;
    } catch (err) {
      console.warn('[Workspace] Import failed:', err);
      return false;
    }
  },

  async deleteFile(filename: string): Promise<boolean> {
    const workspacePath = getWorkspacePath();
    const safeName = filename
      .replace(/\.\./g, '.')
      .replace(/[;&|`$(){}]/g, '_');
    const path = `${workspacePath}/${safeName}`;

    try {
      const result = await terminalService.exec({
        command: `rm "${path}"`,
        sessionId: 'workspace-delete',
      });
      return result.exitCode === 0;
    } catch (err) {
      console.warn('[Workspace] Delete failed:', err);
      return false;
    }
  },

  async exportChatAsMarkdown(chatMessages: { role: string; content: string }[]): Promise<string> {
    const lines = ['# Chat Export\n'];
    for (const msg of chatMessages) {
      const label = msg.role === 'user' ? '**You**' : '**Amo**';
      lines.push(`\n### ${label}\n`);
      lines.push(msg.content);
    }
    return lines.join('\n');
  },

  async writeAndImport(
    content: string,
    _chatId: string,
    filenameHint?: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeContent = content.slice(0, 5000);
    const filename = filenameHint || `amo-generated-${timestamp}.txt`;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const writeResult = await this.writeFile(safeName, safeContent);
    if (!writeResult.success) {
      return `Failed to save file: ${writeResult.error}`;
    }

    const importResult = await this.importToKnowledge(safeName);
    if (!importResult) {
      return `Saved to ${writeResult.path} but failed to import to knowledge.`;
    }

    return `Saved to ${writeResult.path} and imported to your knowledge brain.`;
  },
};
