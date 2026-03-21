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

export class WorkspaceService {
  private static instance: WorkspaceService;
  private workspaces: Workspace[] = [];
  private currentWorkspace: Workspace | null = null;
  private readonly WORKSPACES_KEY = 'amo_workspaces';
  private readonly CURRENT_WORKSPACE_KEY = 'amo_current_workspace';

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

  async saveToWorkspace(filename: string, content: string): Promise<string> {
    const workspace = this.getCurrentWorkspace();
    if (!workspace) {
      throw new Error('No active workspace');
    }

    const fullPath = `${workspace.path}/${filename}`;
    
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: fullPath,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    } else {
      // In browser, use download
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return fullPath;
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
