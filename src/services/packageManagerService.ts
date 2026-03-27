import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { registerPlugin } from '@capacitor/core';

interface NativePackagePlugin {
  checkTool(options: { name: string }): Promise<{ available: boolean; version?: string; path?: string }>;
  installTool(options: { name: string; url: string; version: string }): Promise<{ success: boolean; path: string; message: string }>;
  uninstallTool(options: { name: string }): Promise<{ success: boolean; message: string }>;
  listTools(): Promise<{ tools: ToolInfo[] }>;
  executeTool(options: { name: string; args: string[]; cwd?: string; timeoutMs?: number }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  getEnv(): Promise<{ PATH: string; HOME: string }>;
}

// Re-export as ToolInfo for backward compatibility
export type ToolInfo = InstalledTool;

declare global {
  interface Window {
    Capacitor?: {
      Plugins?: Record<string, any>;
    };
  }
}

const NativePackage = registerPlugin<NativePackagePlugin>('NativePackage');

export interface ToolPackage {
  name: string;
  displayName: string;
  description: string;
  category: 'runtime' | 'tool' | 'language' | 'utility';
  versions: ToolVersion[];
  icon: string;
}

export interface ToolVersion {
  version: string;
  downloadUrl: string;
  size: number;
  checksum?: string;
}

export interface InstalledTool {
  name: string;
  version: string;
  path: string;
  installed: boolean;
  size: number;
}

export const PACKAGE_CATALOG: ToolPackage[] = [
  {
    name: 'node',
    displayName: 'Node.js',
    description: 'JavaScript runtime for server-side development',
    category: 'runtime',
    icon: '⬢',
    versions: [
      {
        version: '20.11.0',
        downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-arm64.tar.gz',
        size: 32 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'python',
    displayName: 'Python',
    description: 'Popular programming language',
    category: 'language',
    icon: '🐍',
    versions: [
      {
        version: '3.11.6',
        downloadUrl: 'https://www.python.org/ftp/python/3.11.6/python-3.11.6-embed-amd64.zip',
        size: 8 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'git',
    displayName: 'Git',
    description: 'Version control system',
    category: 'tool',
    icon: '📦',
    versions: [
      {
        version: '2.43.0',
        downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/PortableGit-2.43.0-64-bit.7z.exe',
        size: 50 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'go',
    displayName: 'Go',
    description: 'Go programming language',
    category: 'language',
    icon: '🔵',
    versions: [
      {
        version: '1.21.6',
        downloadUrl: 'https://go.dev/dl/go1.21.6.linux-arm64.tar.gz',
        size: 105 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'rust',
    displayName: 'Rust',
    description: 'Systems programming language',
    category: 'language',
    icon: '🦀',
    versions: [
      {
        version: '1.75.0',
        downloadUrl: 'https://static.rust-lang.org/dist/rust-1.75.0-x86_64-unknown-linux-gnu.tar.gz',
        size: 250 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'bun',
    displayName: 'Bun',
    description: 'Fast JavaScript runtime',
    category: 'runtime',
    icon: '🍞',
    versions: [
      {
        version: '1.0.26',
        downloadUrl: 'https://github.com/oven-sh/bun/releases/download/bun-v1.0.26/bun-linux-x64.zip',
        size: 30 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'deno',
    displayName: 'Deno',
    description: 'Modern JavaScript runtime',
    category: 'runtime',
    icon: '🦕',
    versions: [
      {
        version: '1.40.0',
        downloadUrl: 'https://github.com/denoland/deno/releases/download/v1.40.0/deno-x86_64-unknown-linux-gnu.zip',
        size: 30 * 1024 * 1024,
      },
    ],
  },
  {
    name: 'gcc',
    displayName: 'GCC',
    description: 'GNU Compiler Collection',
    category: 'tool',
    icon: '⚙️',
    versions: [
      {
        version: '13.2.0',
        downloadUrl: 'https://github.com/wcandillon/gcc-arm-none-eabi-win32/releases/download/v9',
        size: 150 * 1024 * 1024,
      },
    ],
  },
];

class PackageManagerService {
  private toolsPath: string = '';
  private nativePlugin: NativePackagePlugin | null = null;

  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.nativePlugin = NativePackage as NativePackagePlugin;
      this.initializeStorage();
    }
  }

  private async initializeStorage(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: 'amo-tools',
        directory: 'CACHE' as any,
      });
      const result = await Filesystem.getUri({
        path: 'amo-tools',
        directory: 'CACHE' as any,
      });
      this.toolsPath = result.uri;
    } catch (e) {
      console.error('Failed to initialize tools storage:', e);
    }
  }

  async checkInstalled(): Promise<ToolInfo[]> {
    if (!this.nativePlugin) {
      return this.getMockInstalledTools();
    }

    try {
      const result = await this.nativePlugin.listTools();
      return result.tools;
    } catch (e) {
      console.error('Failed to check installed tools:', e);
      return [];
    }
  }

  async checkTool(toolName: string): Promise<{ available: boolean; version?: string; path?: string }> {
    if (!this.nativePlugin) {
      return { available: false };
    }

    try {
      return await this.nativePlugin.checkTool({ name: toolName });
    } catch (e) {
      return { available: false };
    }
  }

  async installTool(pkg: ToolPackage, version: ToolVersion, onProgress?: (progress: number, status: string) => void): Promise<{ success: boolean; message: string }> {
    if (!this.nativePlugin) {
      return this.mockInstallTool(pkg, version, onProgress);
    }

    onProgress?.(0, `Downloading ${pkg.displayName} ${version.version}...`);

    try {
      const result = await this.nativePlugin.installTool({
        name: pkg.name,
        url: version.downloadUrl,
        version: version.version,
      });

      onProgress?.(100, result.message);
      return result;
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Installation failed' };
    }
  }

  async uninstallTool(toolName: string): Promise<{ success: boolean; message: string }> {
    if (!this.nativePlugin) {
      return { success: true, message: `${toolName} uninstalled (mock)` };
    }

    try {
      return await this.nativePlugin.uninstallTool({ name: toolName });
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Uninstall failed' };
    }
  }

  async executeCommand(toolName: string, args: string[], options?: { cwd?: string; timeoutMs?: number }): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.nativePlugin) {
      return { stdout: '', stderr: 'Tool execution requires Android native plugin', exitCode: 1 };
    }

    try {
      return await this.nativePlugin.executeTool({
        name: toolName,
        args,
        cwd: options?.cwd,
        timeoutMs: options?.timeoutMs || 60000,
      });
    } catch (e) {
      return { stdout: '', stderr: e instanceof Error ? e.message : 'Execution failed', exitCode: 1 };
    }
  }

  getCatalog(): ToolPackage[] {
    return PACKAGE_CATALOG;
  }

  getPackagesByCategory(category: ToolPackage['category']): ToolPackage[] {
    return PACKAGE_CATALOG.filter(pkg => pkg.category === category);
  }

  private getMockInstalledTools(): InstalledTool[] {
    return [
      { name: 'node', version: '20.11.0', path: '/data/local/tmp/amo-tools/node', installed: true, size: 32 * 1024 * 1024 },
      { name: 'npm', version: '10.2.4', path: '/data/local/tmp/amo-tools/node/lib/node_modules/npm', installed: true, size: 5 * 1024 * 1024 },
    ];
  }

  private async mockInstallTool(pkg: ToolPackage, version: ToolVersion, onProgress?: (progress: number, status: string) => void): Promise<{ success: boolean; message: string }> {
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      onProgress?.(i, `Installing ${pkg.displayName}... ${i}%`);
    }
    return { success: true, message: `${pkg.displayName} ${version.version} installed` };
  }
}

export const packageManager = new PackageManagerService();
