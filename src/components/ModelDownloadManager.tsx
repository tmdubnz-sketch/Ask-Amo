import { useState, useEffect } from 'react';
import { Download, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { nativeOfflineLlmService, type NativeOfflineModelInfo } from '../services/nativeOfflineLlmService';
import { cn } from '../lib/utils';
import { useModelSettingsStore } from '../stores/modelSettingsStore';

export interface DownloadableModel {
  id: string;
  name: string;
  description: string;
  url: string;
  size: string;
}

export const AVAILABLE_OFFLINE_MODELS: DownloadableModel[] = [
  {
    id: 'phi-3.5-mini',
    name: 'Phi-3.5 Mini',
    description: 'Microsoft - optimized for mobile (recommended for S20)',
    url: 'https://huggingface.co/lm-kit/phi-3.5-mini-3.8b-instruct-gguf/resolve/main/Phi-3.5-mini-Instruct-Q4_K_M.gguf',
    size: '~2.4 GB',
  },
];

interface ModelDownloadManagerProps {
  downloadedModels: string[];
  isDownloading: boolean;
  onDownload?: (model: DownloadableModel) => void;
  onDelete?: (modelId: string) => void;
}

export function ModelDownloadManager({ downloadedModels = [], isDownloading, onDownload, onDelete }: ModelDownloadManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const { loadLocalModels } = useModelSettingsStore();

  const handleDownload = async (model: DownloadableModel) => {
    setError(null);
    try {
      onDownload?.(model);
      // After download completes, refresh the model list
      setTimeout(() => {
        loadLocalModels();
      }, 2000); // Give some time for the download to complete
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      onDelete?.(modelId);
      // After deletion, refresh the model list
      setTimeout(() => {
        loadLocalModels();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-2">
      {AVAILABLE_OFFLINE_MODELS.map((model) => {
        const isDownloaded = downloadedModels.includes(model.id);

        return (
          <div
            key={model.id}
            className={cn(
              "p-3 rounded-xl border transition-all",
              isDownloaded
                ? "bg-green-500/5 border-green-500/20"
                : isDownloading
                ? "bg-[#ff4e00]/5 border-[#ff4e00]/20"
                : "bg-white/[0.03] border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{model.name}</span>
                  {isDownloaded && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                      READY
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">{model.description}</div>
                <div className="text-[9px] text-white/25 mt-1">{model.size}</div>
              </div>

              <div className="shrink-0">
                {isDownloading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-[#ff4e00] animate-spin" />
                  </div>
                ) : isDownloaded ? (
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
                    title="Delete model"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleDownload(model)}
                    disabled={isDownloading}
                    className="p-2 rounded-lg border border-[#ff4e00]/25 bg-[#ff4e00]/8 text-[#ff4e00] hover:bg-[#ff4e00]/15 transition-all disabled:opacity-50"
                    title="Download model"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}
          </div>
        );
      })}

      {isDownloading && (
        <div className="text-[10px] text-white/30 text-center py-2">
          Downloading... Do not close the app.
        </div>
      )}
    </div>
  );
}
