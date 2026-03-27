import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem, Encoding } from '@capacitor/filesystem';

export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  lastAccessed: number;
  isDefault: boolean;
}

export interface WorkspaceEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export class WorkspaceService {
  private static instance: WorkspaceService;
  private workspaces: Workspace[] = [];
  private currentWorkspace: Workspace | null = null;
  private readonly WORKSPACES_KEY = 'amo_workspaces';
  private readonly CURRENT_WORKSPACE_KEY = 'amo_current_workspace';
  private readonly BROWSER_FILE_PREFIX = 'amo-file:';
  private readonly BROWSER_DIR_PREFIX = 'amo-dir:';

  static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  async init(): Promise<void> {
    await this.loadWorkspaces();
    
    // If no workspaces exist, create a default one
    if (this.workspaces.length === 0) {
      await this.createDefaultWorkspace();
    }
    
    // Set current workspace
    const currentId = localStorage.getItem(this.CURRENT_WORKSPACE_KEY);
    if (currentId) {
      this.currentWorkspace = this.workspaces.find(w => w.id === currentId) || this.workspaces[0];
    } else {
      this.currentWorkspace = this.workspaces[0];
    }
  }

  private async loadWorkspaces(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.WORKSPACES_KEY);
      if (stored) {
        this.workspaces = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Workspace] Failed to load workspaces:', error);
      this.workspaces = [];
    }
  }

  private async saveWorkspaces(): Promise<void> {
    try {
      localStorage.setItem(this.WORKSPACES_KEY, JSON.stringify(this.workspaces));
    } catch (error) {
      console.error('[Workspace] Failed to save workspaces:', error);
    }
  }

  private async createDefaultWorkspace(): Promise<void> {
    const defaultWorkspace: Workspace = {
      id: 'default',
      name: 'Default Workspace',
      path: Capacitor.getPlatform() === 'android' ? '/storage/emulated/0/Documents/AskAmo' : './workspace',
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isDefault: true
    };

    this.workspaces.push(defaultWorkspace);
    await this.saveWorkspaces();

    // Create the directory if it doesn't exist
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.mkdir({
          path: defaultWorkspace.path,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (error) {
        // Directory might already exist
        console.log('[Workspace] Directory exists or creation failed:', error);
      }
    }

    // Create AMO.md in the workspace
    this.currentWorkspace = defaultWorkspace;
    await this.ensureAmoConfig();
  }

  async createWorkspace(name: string, customPath?: string): Promise<Workspace> {
    const workspace: Workspace = {
      id: `workspace_${Date.now()}`,
      name,
      path: customPath || (Capacitor.getPlatform() === 'android' 
        ? `/storage/emulated/0/Documents/AskAmo/${name.replace(/\s+/g, '_')}`
        : `./workspace/${name.replace(/\s+/g, '_')}`),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isDefault: false
    };

    this.workspaces.push(workspace);
    await this.saveWorkspaces();

    // Create the directory
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.mkdir({
          path: workspace.path,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (error) {
        console.error('[Workspace] Failed to create directory:', error);
      }
    }

    // Create AMO.md in the workspace
    this.currentWorkspace = workspace;
    await this.ensureAmoConfig();

    return workspace;
  }

  async switchWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      this.currentWorkspace = workspace;
      workspace.lastAccessed = Date.now();
      localStorage.setItem(this.CURRENT_WORKSPACE_KEY, workspaceId);
      await this.saveWorkspaces();
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    // Don't allow deleting the default workspace
    const workspace = this.workspaces.find(w => w.id === workspaceId);
    if (workspace?.isDefault) {
      throw new Error('Cannot delete the default workspace');
    }

    this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
    
    // If deleting current workspace, switch to default
    if (this.currentWorkspace?.id === workspaceId) {
      await this.switchWorkspace('default');
    }
    
    await this.saveWorkspaces();
  }

  getCurrentWorkspace(): Workspace | null {
    return this.currentWorkspace;
  }

  getAllWorkspaces(): Workspace[] {
    return [...this.workspaces];
  }

  async getWorkspacePath(): Promise<string> {
    if (!this.currentWorkspace) {
      await this.init();
    }
    return this.currentWorkspace?.path || './workspace';
  }

  private normalizeRelativePath(targetPath: string): string {
    return targetPath
      .replace(/\\/g, '/')
      .split('/')
      .filter((segment) => segment && segment !== '.' && segment !== '..')
      .join('/');
  }

  private getBrowserStorageKey(targetPath: string): string {
    return `${this.BROWSER_FILE_PREFIX}${this.normalizeRelativePath(targetPath)}`;
  }

  private getBrowserDirectoryKey(targetPath: string): string {
    return `${this.BROWSER_DIR_PREFIX}${this.normalizeRelativePath(targetPath)}`;
  }

  private ensureBrowserDirectoryMarkers(relativePath: string): void {
    const segments = relativePath.split('/');
    if (segments.length < 2) return;

    for (let index = 1; index < segments.length; index += 1) {
      const dirPath = segments.slice(0, index).join('/');
      localStorage.setItem(this.getBrowserDirectoryKey(dirPath), 'dir');
    }
  }

  private getNativeRelativeWorkspacePath(workspacePath: string): string {
    const normalized = workspacePath.replace(/\\/g, '/');
    const marker = '/Documents/';
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex >= 0) {
      return normalized.slice(markerIndex + marker.length);
    }
    return normalized.replace(/^\/+/, '');
  }

  private async ensureNativeDirectory(relativeDirPath: string): Promise<void> {
    if (!relativeDirPath) return;
    await Filesystem.mkdir({
      path: relativeDirPath,
      directory: Directory.Documents,
      recursive: true,
    });
  }

  async saveToWorkspace(filename: string, content: string): Promise<string> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace) {
      throw new Error('No active workspace');
    }

    const relativePath = this.normalizeRelativePath(filename);
    if (!relativePath) {
      throw new Error('Invalid workspace file path');
    }

    const fullPath = `${workspace.path}/${relativePath}`;
    
    if (Capacitor.isNativePlatform()) {
      const workspaceRelativeRoot = this.getNativeRelativeWorkspacePath(workspace.path);
      const nativeTargetPath = `${workspaceRelativeRoot}/${relativePath}`;
      const parentDir = nativeTargetPath.includes('/')
        ? nativeTargetPath.slice(0, nativeTargetPath.lastIndexOf('/'))
        : workspaceRelativeRoot;

      await this.ensureNativeDirectory(parentDir);

      await Filesystem.writeFile({
        path: nativeTargetPath,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    } else {
      this.ensureBrowserDirectoryMarkers(relativePath);
      localStorage.setItem(this.getBrowserStorageKey(relativePath), content);
    }

    return fullPath;
  }

  async readWorkspaceFile(targetPath: string): Promise<string | null> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace) {
      return null;
    }

    const relativePath = this.normalizeRelativePath(targetPath);
    if (!relativePath) {
      return null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const workspaceRelativeRoot = this.getNativeRelativeWorkspacePath(workspace.path);
        const result = await Filesystem.readFile({
          path: `${workspaceRelativeRoot}/${relativePath}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        return typeof result.data === 'string' ? result.data : null;
      } catch (error) {
        console.error('[Workspace] Failed to read file:', error);
        return null;
      }
    }

    return localStorage.getItem(this.getBrowserStorageKey(relativePath));
  }

  async createWorkspaceFile(targetPath: string): Promise<string> {
    const relativePath = this.normalizeRelativePath(targetPath);
    if (!relativePath) {
      throw new Error('Invalid workspace file path');
    }

    await this.saveToWorkspace(relativePath, '');
    return relativePath;
  }

  async createWorkspaceDirectory(targetPath: string): Promise<string> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace) {
      throw new Error('No active workspace');
    }

    const relativePath = this.normalizeRelativePath(targetPath);
    if (!relativePath) {
      throw new Error('Invalid workspace directory path');
    }

    if (Capacitor.isNativePlatform()) {
      const workspaceRelativeRoot = this.getNativeRelativeWorkspacePath(workspace.path);
      await this.ensureNativeDirectory(`${workspaceRelativeRoot}/${relativePath}`);
    } else {
      this.ensureBrowserDirectoryMarkers(`${relativePath}/placeholder`);
      localStorage.setItem(this.getBrowserDirectoryKey(relativePath), 'dir');
    }

    return `${workspace.path}/${relativePath}`;
  }

  async readAmoConfig(): Promise<string | null> {
    const content = await this.readWorkspaceFile('AMO.md');
    return content;
  }

  async writeAmoConfig(content: string): Promise<void> {
    await this.saveToWorkspace('AMO.md', content);
  }

  async ensureAmoConfig(): Promise<void> {
    const existing = await this.readAmoConfig();
    if (!existing) {
      const defaultContent = `# AMO.md - Project Context for Amo

This file provides context for the AI assistant about this project.

## Project Name
[Your project name]

## Description
Brief description of what this project does.

## Tech Stack
- Language/Framework
- Key dependencies
- Build tools

## Commands
\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Notes
Any additional context or instructions for Amo.

---
*This file is read by Amo to provide project-specific context.*
`;
      await this.writeAmoConfig(defaultContent);
    }
  }

  async listWorkspaceEntries(): Promise<WorkspaceEntry[]> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace) {
      return [];
    }

    if (Capacitor.isNativePlatform()) {
      const workspaceRelativeRoot = this.getNativeRelativeWorkspacePath(workspace.path);

      const walk = async (relativeDir: string): Promise<WorkspaceEntry[]> => {
        const result = await Filesystem.readdir({
          path: relativeDir,
          directory: Directory.Documents,
        });

        const entries: WorkspaceEntry[] = [];

        for (const entry of result.files) {
          const isDirectory = entry.type === 'directory';
          const entryPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
          const relativeEntryPath = entryPath.startsWith(`${workspaceRelativeRoot}/`)
            ? entryPath.slice(workspaceRelativeRoot.length + 1)
            : entry.name;

          entries.push({
            name: entry.name,
            path: relativeEntryPath,
            isDirectory,
          });

          if (isDirectory) {
            entries.push(...await walk(entryPath));
          }
        }

        return entries;
      };

      try {
        await this.ensureNativeDirectory(workspaceRelativeRoot);
        return await walk(workspaceRelativeRoot);
      } catch (error) {
        console.error('[Workspace] Failed to list entries:', error);
        return [];
      }
    }

    const fileEntries = Object.keys(localStorage)
      .filter((key) => key.startsWith(this.BROWSER_FILE_PREFIX))
      .map((key) => key.slice(this.BROWSER_FILE_PREFIX.length))
      .filter(Boolean)
      .map((path) => ({
        name: path.split('/').pop() || path,
        path,
        isDirectory: false,
      }));

    const directoryEntries = Object.keys(localStorage)
      .filter((key) => key.startsWith(this.BROWSER_DIR_PREFIX))
      .map((key) => key.slice(this.BROWSER_DIR_PREFIX.length))
      .filter(Boolean)
      .map((path) => ({
        name: path.split('/').pop() || path,
        path,
        isDirectory: true,
      }));

    return [...directoryEntries, ...fileEntries].sort((left, right) => left.path.localeCompare(right.path));
  }

  async listWorkspaceFiles(): Promise<string[]> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace || !Capacitor.isNativePlatform()) {
      return [];
    }

    try {
      const result = await Filesystem.readdir({
        path: workspace.path,
        directory: Directory.Documents
      });
      return result.files.map(f => f.name);
    } catch (error) {
      console.error('[Workspace] Failed to list files:', error);
      return [];
    }
  }
}

export const workspaceService = WorkspaceService.getInstance();
