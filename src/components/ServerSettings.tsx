import { useState, useEffect, useCallback } from 'react';
import { Settings, Server, FolderOpen, Play, Square, X, Loader2 } from 'lucide-react';

interface ServerConfig {
  enabled: boolean;
  port: number;
  dataDir: string;
}

interface ServerStatus {
  running: boolean;
  config: ServerConfig;
}

interface ServerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    tandemElectron?: {
      startServer: () => Promise<boolean>;
      stopServer: () => Promise<boolean>;
      getServerStatus: () => Promise<ServerStatus>;
      setServerConfig: (config: Partial<ServerConfig>) => Promise<ServerConfig>;
      selectDataDirectory: () => Promise<string | null>;
      onServerLog: (callback: (data: string) => void) => void;
      onServerStopped: (callback: () => void) => void;
      onOpenSettings: (callback: () => void) => void;
      platform: string;
      isElectron: boolean;
    };
  }
}

export function ServerSettings({ isOpen, onClose }: ServerSettingsProps) {
  const [config, setConfig] = useState<ServerConfig>({
    enabled: false,
    port: 3000,
    dataDir: '',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const isElectron = typeof window !== 'undefined' && window.tandemElectron?.isElectron;

  // Load initial status
  useEffect(() => {
    if (isElectron && isOpen) {
      window.tandemElectron!.getServerStatus().then((status) => {
        setConfig(status.config);
        setIsRunning(status.running);
      });
    }
  }, [isElectron, isOpen]);

  // Listen for server events
  useEffect(() => {
    if (!isElectron) return;

    window.tandemElectron!.onServerLog((data) => {
      setLogs((prev) => [...prev.slice(-50), data]);
    });

    window.tandemElectron!.onServerStopped(() => {
      setIsRunning(false);
      setIsLoading(false);
    });
  }, [isElectron]);

  const handleStartServer = useCallback(async () => {
    if (!isElectron) return;
    setIsLoading(true);
    setLogs([]);
    try {
      await window.tandemElectron!.startServer();
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start server:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isElectron]);

  const handleStopServer = useCallback(async () => {
    if (!isElectron) return;
    setIsLoading(true);
    try {
      await window.tandemElectron!.stopServer();
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop server:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isElectron]);

  const handleSelectDirectory = useCallback(async () => {
    if (!isElectron) return;
    const dir = await window.tandemElectron!.selectDataDirectory();
    if (dir) {
      const newConfig = await window.tandemElectron!.setServerConfig({ dataDir: dir });
      setConfig(newConfig);
    }
  }, [isElectron]);

  const handlePortChange = useCallback(async (port: number) => {
    if (!isElectron) return;
    const newConfig = await window.tandemElectron!.setServerConfig({ port });
    setConfig(newConfig);
  }, [isElectron]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              伺服器設定
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!isElectron ? (
            <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
              <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>伺服器設定僅在桌面應用程式中可用</p>
              <p className="text-sm mt-2">
                目前連接到: <span className="font-mono text-blue-500">tandem.irisgo.xyz</span>
              </p>
            </div>
          ) : (
            <>
              {/* Server Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    {isRunning ? '伺服器運行中' : '伺服器已停止'}
                  </span>
                </div>
                <button
                  onClick={isRunning ? handleStopServer : handleStartServer}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isRunning
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  } disabled:opacity-50`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRunning ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunning ? '停止' : '啟動'}
                </button>
              </div>

              {/* Port Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  連接埠
                </label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => handlePortChange(parseInt(e.target.value, 10))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                  min={1024}
                  max={65535}
                />
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                  分享連結: http://localhost:{config.port}
                </p>
              </div>

              {/* Data Directory */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  資料目錄
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.dataDir}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    onClick={handleSelectDirectory}
                    disabled={isRunning}
                    className="px-3 py-2 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <FolderOpen className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Server Logs */}
              {logs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    伺服器日誌
                  </label>
                  <div className="h-32 overflow-y-auto bg-gray-900 rounded-lg p-2 font-mono text-xs text-green-400">
                    {logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg text-gray-700 dark:text-zinc-300 font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
