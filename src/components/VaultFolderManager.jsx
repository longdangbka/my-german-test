import React, { useState, useEffect } from 'react';

export default function VaultFolderManager({ onVaultChanged }) {
  const [vaultInfo, setVaultInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Load vault info when component mounts
  useEffect(() => {
    loadVaultInfo();
  }, []);

  const loadVaultInfo = async () => {
    try {
      if (window.electron && window.electron.getVaultInfo) {
        const info = await window.electron.getVaultInfo();
        setVaultInfo(info);
      }
    } catch (error) {
      console.error('Error loading vault info:', error);
      setStatusMessage('Error loading vault information');
    }
  };

  const selectVaultFolder = async () => {
    setIsLoading(true);
    setStatusMessage('');
    
    try {
      if (!window.electron || !window.electron.selectVaultFolder) {
        setStatusMessage('Vault folder selection is only available in the Electron app');
        return;
      }

      const result = await window.electron.selectVaultFolder();
      
      if (result.success) {
        setStatusMessage('Successfully selected vault folder');
        await loadVaultInfo(); // Refresh vault info
        if (onVaultChanged) {
          onVaultChanged(); // Notify parent component
        }
      } else {
        setStatusMessage(result.error || 'Failed to select vault folder');
      }
    } catch (error) {
      console.error('Error selecting vault folder:', error);
      setStatusMessage('Error selecting vault folder');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = async () => {
    setIsLoading(true);
    setStatusMessage('');
    
    try {
      if (!window.electron || !window.electron.resetVaultToDefault) {
        setStatusMessage('Vault reset is only available in the Electron app');
        return;
      }

      const result = await window.electron.resetVaultToDefault();
      
      if (result.success) {
        setStatusMessage('Successfully reset to default vault location');
        await loadVaultInfo(); // Refresh vault info
        if (onVaultChanged) {
          onVaultChanged(); // Notify parent component
        }
      } else {
        setStatusMessage(result.error || 'Failed to reset vault location');
      }
    } catch (error) {
      console.error('Error resetting vault:', error);
      setStatusMessage('Error resetting vault location');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show vault settings in web browser
  if (!window.electron) {
    return null;
  }

  return (
    <div className="vault-folder-manager">
      {/* Settings toggle button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Vault Settings"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Vault Settings
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Vault Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current vault info */}
            {vaultInfo && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Current Vault
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <div>
                    <span className="font-medium">Type:</span> {vaultInfo.isCustom ? 'Custom' : 'Default'}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> 
                    <div className="break-all text-xs mt-1 font-mono bg-gray-100 dark:bg-gray-600 p-1 rounded">
                      {vaultInfo.path || 'Not found'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={selectVaultFolder}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {isLoading ? 'Selecting...' : 'Select Custom Vault Folder'}
              </button>

              {vaultInfo?.isCustom && (
                <button
                  onClick={resetToDefault}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset to Default Vault
                </button>
              )}
            </div>

            {/* Status message */}
            {statusMessage && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${
                statusMessage.includes('Success') ? 
                'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {statusMessage}
              </div>
            )}

            {/* Help text */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>The vault folder should contain your quiz files (.md files). 
              You can organize them in any folder structure you prefer.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
