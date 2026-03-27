import React, { useState, useEffect } from 'react';
import { Download, Trash2, Check, X, Package as PackageIcon, Terminal, Loader2, Box } from 'lucide-react';
import { packageManager, ToolPackage, InstalledTool } from '../services/packageManagerService';
import { cn } from '../lib/utils';

interface PackageManagerProps {
  onClose?: () => void;
}

export function PackageManager({ onClose }: PackageManagerProps) {
  const [installedTools, setInstalledTools] = useState<InstalledTool[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ToolPackage['category'] | 'installed'>('installed');
  const [installing, setInstalling] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadInstalledTools();
  }, []);

  const loadInstalledTools = async () => {
    const tools = await packageManager.checkInstalled();
    setInstalledTools(tools);
  };

  const handleInstall = async (pkg: ToolPackage) => {
    setInstalling(pkg.name);
    setInstallProgress(0);
    setInstallStatus('Starting installation...');

    try {
      const result = await packageManager.installTool(pkg, pkg.versions[0], (progress, status) => {
        setInstallProgress(progress);
        setInstallStatus(status);
      });

      if (result.success) {
        setNotification({ type: 'success', message: result.message });
        await loadInstalledTools();
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    } catch {
      setNotification({ type: 'error', message: 'Installation failed' });
    } finally {
      setInstalling(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleUninstall = async (toolName: string) => {
    const result = await packageManager.uninstallTool(toolName);
    if (result.success) {
      setNotification({ type: 'success', message: result.message });
      await loadInstalledTools();
    } else {
      setNotification({ type: 'error', message: result.message });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const isInstalled = (pkgName: string) => installedTools.some(t => t.name === pkgName);

  const categories = [
    { key: 'installed' as const, label: 'Installed', icon: Check },
    { key: 'runtime' as const, label: 'Runtimes', icon: Terminal },
    { key: 'language' as const, label: 'Languages', icon: Box },
    { key: 'tool' as const, label: 'Tools', icon: Download },
  ];

  const packages = selectedCategory === 'installed'
    ? packageManager.getCatalog().filter(pkg => isInstalled(pkg.name))
    : packageManager.getPackagesByCategory(selectedCategory);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <PackageIcon className="w-5 h-5 text-[#ff4e00]" />
          <div>
            <h2 className="text-sm font-semibold text-white/90">Package Manager</h2>
            <p className="text-xs text-white/50">{installedTools.length} tools installed</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 overflow-x-auto">
        {categories.map(cat => {
          const Icon = cat.icon;
          const count = cat.key === 'installed'
            ? installedTools.length
            : packageManager.getPackagesByCategory(cat.key).length;
          
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                selectedCategory === cat.key
                  ? "bg-[#ff4e00] text-white"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
              <span className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Package list */}
      <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
        {packages.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <PackageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No packages in this category</p>
            <p className="text-xs mt-1">Select a different category</p>
          </div>
        ) : (
          packages.map(pkg => {
            const installed = isInstalled(pkg.name);
            const toolInfo = installedTools.find(t => t.name === pkg.name);
            const isInstalling = installing === pkg.name;

            return (
              <div
                key={pkg.name}
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  installed
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-white/[0.03] border-white/8 hover:border-white/15"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{pkg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white/90">{pkg.displayName}</h3>
                      {installed && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{pkg.description}</p>
                    {toolInfo && (
                      <p className="text-xs text-white/30 mt-1">
                        v{toolInfo.version} • {formatSize(toolInfo.size)}
                      </p>
                    )}
                    {!installed && pkg.versions[0] && (
                      <p className="text-xs text-white/30 mt-1">
                        v{pkg.versions[0].version} • {formatSize(pkg.versions[0].size)}
                      </p>
                    )}
                  </div>
                  <div>
                    {isInstalling ? (
                      <div className="w-20">
                        <div className="flex items-center gap-1 text-xs text-white/50 mb-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {installProgress}%
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#ff4e00] transition-all duration-200"
                            style={{ width: `${installProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : installed ? (
                      <button
                        onClick={() => handleUninstall(pkg.name)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                        title="Uninstall"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(pkg)}
                        className="px-3 py-1.5 rounded-lg bg-[#ff4e00] text-white text-xs font-medium hover:bg-[#ff4e00]/90 transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Install
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={cn(
          "absolute bottom-20 left-4 right-4 p-3 rounded-xl border text-sm text-center",
          notification.type === 'success'
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
