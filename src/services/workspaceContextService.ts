import { terminalBridgeService } from './terminalBridgeService';

export interface WorkspaceSnapshot {
  cwd: string;
  files: string[];
  recentFiles: string[];
  packageJson: string | null;
  gitStatus: string | null;
  builtAt: number;
}

export const workspaceContextService = {
  async buildSnapshot(chatId: string): Promise<WorkspaceSnapshot> {
    const cwd = terminalBridgeService.getCwd(chatId) || 'amo-workspace/';

    const [fileList, gitStatus, packageJson] = await Promise.allSettled([
      terminalBridgeService.run(`find ${cwd} -maxdepth 2 -type f | head -30`, chatId),
      terminalBridgeService.run('git status --short 2>/dev/null || echo "not a git repo"', chatId),
      terminalBridgeService.run(`cat ${cwd}/package.json 2>/dev/null || echo ""`, chatId),
    ]);

    const files = fileList.status === 'fulfilled' && fileList.value.success
      ? fileList.value.output.split('\n').filter(Boolean)
      : [];

    return {
      cwd,
      files,
      recentFiles: files.slice(0, 10),
      packageJson: packageJson.status === 'fulfilled' ? packageJson.value.output || null : null,
      gitStatus: gitStatus.status === 'fulfilled' ? gitStatus.value.output || null : null,
      builtAt: Date.now(),
    };
  },

  formatForPrompt(snapshot: WorkspaceSnapshot): string {
    const lines = [
      `[Workspace context]`,
      `Working directory: ${snapshot.cwd}`,
    ];
    if (snapshot.files.length > 0) {
      lines.push(`Files: ${snapshot.files.join(', ')}`);
    }
    if (snapshot.gitStatus) {
      lines.push(`Git status: ${snapshot.gitStatus.trim()}`);
    }
    if (snapshot.packageJson) {
      try {
        const pkg = JSON.parse(snapshot.packageJson);
        lines.push(`Project: ${pkg.name || 'unknown'} v${pkg.version || '?'}`);
        if (pkg.scripts) {
          lines.push(`Scripts: ${Object.keys(pkg.scripts).join(', ')}`);
        }
      } catch {}
    }
    return lines.join('\n');
  },
};
