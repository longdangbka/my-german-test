const { app, BrowserWindow, ipcMain, nativeTheme, Menu, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.ELECTRON_IS_DEV === 'true';

// Custom vault path management
let customVaultPath = null;

// Load custom vault path from user data
function loadCustomVaultPath() {
  try {
    const userDataPath = app.getPath('userData');
    const configFile = path.join(userDataPath, 'vault-config.json');
    
    if (fs.existsSync(configFile)) {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      if (config.customVaultPath && fs.existsSync(config.customVaultPath)) {
        customVaultPath = config.customVaultPath;
        console.log('Loaded custom vault path:', customVaultPath);
      } else if (config.customVaultPath) {
        console.warn('Custom vault path no longer exists:', config.customVaultPath);
      }
    }
  } catch (error) {
    console.error('Error loading custom vault path:', error);
  }
}

// Save custom vault path to user data
function saveCustomVaultPath(vaultPath) {
  try {
    const userDataPath = app.getPath('userData');
    const configFile = path.join(userDataPath, 'vault-config.json');
    
    // Ensure user data directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    const config = { customVaultPath: vaultPath };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
    customVaultPath = vaultPath;
    console.log('Saved custom vault path:', vaultPath);
  } catch (error) {
    console.error('Error saving custom vault path:', error);
  }
}

// Enable live reload for Electron in development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron.cmd'),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    console.log('Electron reload not available:', e.message);
  }
}

// Register IPC handlers once when app is ready
function registerIpcHandlers() {
  // Handle dark mode
  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light';
    } else {
      nativeTheme.themeSource = 'dark';
    }
    return nativeTheme.shouldUseDarkColors;
  });

  ipcMain.handle('dark-mode:get', () => {
    return nativeTheme.themeSource;
  });

  // Handle vault file requests
  // Helper function to find vault path
  function getVaultPath() {
    // First priority: custom vault path if set and exists
    if (customVaultPath && fs.existsSync(customVaultPath)) {
      console.log('Using custom vault path:', customVaultPath);
      return customVaultPath;
    }
    
    // Second priority: default vault locations
    let vaultPath;
    if (isDev) {
      vaultPath = path.join(__dirname, 'public', 'vault');
    } else {
      vaultPath = path.join(process.resourcesPath, 'vault');
    }
    
    if (!fs.existsSync(vaultPath)) {
      // Try alternative paths
      const altPaths = [
        path.join(__dirname, 'vault'),
        path.join(__dirname, 'public', 'vault'),
        path.join(__dirname, '..', 'vault'),
        path.join(process.cwd(), 'vault')
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          vaultPath = altPath;
          break;
        }
      }
    }
    
    console.log('Using default vault path:', vaultPath);
    return vaultPath;
  }

  ipcMain.handle('vault:read-file', async (event, filename, timestamp = null) => {
    try {
      const vaultPath = getVaultPath();
      const filePath = path.join(vaultPath, filename);
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filename} at ${filePath}`);
        return null;
      }
      
      // Get file stats first
      const stats = fs.statSync(filePath);
      
      // Always read fresh content, no caching - use fd for explicit control
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(stats.size);
      fs.readSync(fd, buffer, 0, stats.size, 0);
      fs.closeSync(fd);
      
      const content = buffer.toString('utf-8');
      
      console.log(`Read file ${filename} (${content.length} chars) - modified: ${stats.mtime.toISOString()}, request timestamp: ${timestamp || 'not provided'}`);
      
      return content;
    } catch (error) {
      console.error('Error reading vault file:', error);
      return null;
    }
  });

  // Handle vault image requests - return as base64 data URL
  ipcMain.handle('vault:read-image', async (event, filename) => {
    try {
      const vaultPath = getVaultPath();
      const filePath = path.join(vaultPath, filename);
      
      if (!fs.existsSync(filePath)) {
        console.error(`Image not found: ${filename} at ${filePath}`);
        return null;
      }
      
      const imageBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'image/jpeg'; // default
      
      // Handle image types
      switch (ext) {
        case '.png':
          mimeType = 'image/png';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        // Handle audio types
        case '.mp3':
          mimeType = 'audio/mpeg';
          break;
        case '.wav':
          mimeType = 'audio/wav';
          break;
        case '.m4a':
          mimeType = 'audio/mp4';
          break;
        case '.ogg':
          mimeType = 'audio/ogg';
          break;
        case '.flac':
          mimeType = 'audio/flac';
          break;
      }
      
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      console.log(`Successfully read file ${filename}, size: ${imageBuffer.length} bytes, type: ${mimeType}`);
      return dataUrl;
    } catch (error) {
      console.error('Error reading vault image:', error);
      return null;
    }
  });

  // Handle vault file listing with metadata
  ipcMain.handle('vault:list-files', async () => {
    try {
      const vaultPath = getVaultPath();
      
      console.log('Listing vault files from:', vaultPath);
      
      if (!fs.existsSync(vaultPath)) {
        console.error('Could not find vault directory in any location');
        return [];
      }
      
      const files = fs.readdirSync(vaultPath);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      // Get file stats for each file
      const filesWithMetadata = mdFiles.map(file => {
        try {
          const filePath = path.join(vaultPath, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            displayName: file.replace('.md', ''),
            createdTime: stats.birthtime || stats.ctime, // Use birthtime if available, fallback to ctime
            modifiedTime: stats.mtime,
            size: stats.size
          };
        } catch (error) {
          console.error(`Error getting stats for file ${file}:`, error);
          return {
            filename: file,
            displayName: file.replace('.md', ''),
            createdTime: new Date(),
            modifiedTime: new Date(),
            size: 0
          };
        }
      });
      
      console.log('Found vault files with metadata:', filesWithMetadata);
      return filesWithMetadata;
    } catch (error) {
      console.error('Error listing vault files:', error);
      return [];
    }
  });

  // Handle writing bookmarks to vault
  ipcMain.handle('vault:write-file', async (event, filename, content) => {
    try {
      const vaultPath = getVaultPath();
      
      // If the vault path doesn't exist, create it
      if (!fs.existsSync(vaultPath)) {
        fs.mkdirSync(vaultPath, { recursive: true });
      }
      
      const filePath = path.join(vaultPath, filename);
      console.log('Writing vault file:', filePath);
      
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Successfully wrote file ${filename}, content length: ${content.length}`);
      return true;
    } catch (error) {
      console.error('Error writing vault file:', error);
      return false;
    }
  });

  // Handle vault folder selection
  ipcMain.handle('vault:select-folder', async (event) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Vault Folder',
        buttonLabel: 'Select Vault Folder',
        message: 'Choose a folder containing your quiz files (.md files)'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        
        // Validate that the folder contains .md files
        const files = fs.readdirSync(selectedPath);
        const mdFiles = files.filter(file => file.endsWith('.md'));
        
        if (mdFiles.length === 0) {
          return { 
            success: false, 
            error: 'Selected folder does not contain any .md (Markdown) files. Please choose a folder with quiz files.' 
          };
        }
        
        // Save the custom vault path
        saveCustomVaultPath(selectedPath);
        
        return { 
          success: true, 
          path: selectedPath
        };
      }
      
      return { success: false, error: 'No folder selected' };
    } catch (error) {
      console.error('Error selecting vault folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle getting current vault info
  ipcMain.handle('vault:get-info', async () => {
    try {
      const currentPath = getVaultPath();
      const isCustom = customVaultPath !== null;
      
      return {
        path: currentPath,
        isCustom
      };
    } catch (error) {
      console.error('Error getting vault info:', error);
      return {
        path: null,
        isCustom: false
      };
    }
  });

  // Handle resetting to default vault
  ipcMain.handle('vault:reset-to-default', async () => {
    try {
      // Clear custom vault path
      customVaultPath = null;
      
      // Remove config file
      const userDataPath = app.getPath('userData');
      const configFile = path.join(userDataPath, 'vault-config.json');
      
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }
      
      console.log('Reset to default vault path');
      return { success: true };
    } catch (error) {
      console.error('Error resetting vault path:', error);
      return { success: false, error: error.message };
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'public', 'favicon.ico'), // Windows icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

  // Load the React app
  if (isDev) {
    // Add cache busting for development
    const cacheBuster = Date.now();
    win.loadURL(`http://localhost:3002?t=${cacheBuster}`);
    win.webContents.openDevTools();
    
    // Add keyboard shortcut for reload in development
    win.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        win.reload();
      }
    });
  } else {
    win.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Create application menu
  createMenu();

  return win;
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Vault',
      submenu: [
        {
          label: 'Select Custom Vault Folder...',
          accelerator: 'Ctrl+O',
          click: async (item, focusedWindow) => {
            if (focusedWindow) {
              const result = await dialog.showOpenDialog(focusedWindow, {
                properties: ['openDirectory'],
                title: 'Select Vault Folder',
                buttonLabel: 'Select Vault Folder',
                message: 'Choose a folder containing your quiz files (.md files)'
              });

              if (!result.canceled && result.filePaths.length > 0) {
                const selectedPath = result.filePaths[0];
                
                try {
                  // Validate that the folder contains .md files
                  const files = fs.readdirSync(selectedPath);
                  const mdFiles = files.filter(file => file.endsWith('.md'));
                  
                  if (mdFiles.length === 0) {
                    dialog.showMessageBox(focusedWindow, {
                      type: 'warning',
                      title: 'No Quiz Files Found',
                      message: 'Selected folder does not contain any .md (Markdown) files.',
                      detail: 'Please choose a folder with quiz files.'
                    });
                    return;
                  }
                  
                  // Save the custom vault path
                  saveCustomVaultPath(selectedPath);
                  
                  // Show success message
                  dialog.showMessageBox(focusedWindow, {
                    type: 'info',
                    title: 'Vault Folder Updated',
                    message: 'Successfully selected vault folder.',
                    detail: `Location: ${selectedPath}`
                  });
                  
                  // Reload the window to refresh the quiz list
                  focusedWindow.reload();
                } catch (error) {
                  console.error('Error selecting vault folder:', error);
                  dialog.showMessageBox(focusedWindow, {
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to access the selected folder.',
                    detail: error.message
                  });
                }
              }
            }
          }
        },
        {
          label: 'Reset to Default Vault',
          click: async (item, focusedWindow) => {
            if (focusedWindow) {
              try {
                // Clear custom vault path
                customVaultPath = null;
                
                // Remove config file
                const userDataPath = app.getPath('userData');
                const configFile = path.join(userDataPath, 'vault-config.json');
                
                if (fs.existsSync(configFile)) {
                  fs.unlinkSync(configFile);
                }
                
                console.log('Reset to default vault path');
                
                // Show success message
                dialog.showMessageBox(focusedWindow, {
                  type: 'info',
                  title: 'Vault Reset',
                  message: 'Successfully reset to default vault location.',
                  detail: 'The app will now use the built-in vault folder.'
                });
                
                // Reload the window to refresh the quiz list
                focusedWindow.reload();
              } catch (error) {
                console.error('Error resetting vault:', error);
                dialog.showMessageBox(focusedWindow, {
                  type: 'error',
                  title: 'Error',
                  message: 'Failed to reset vault location.',
                  detail: error.message
                });
              }
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Show Current Vault Info',
          click: async (item, focusedWindow) => {
            if (focusedWindow) {
              try {
                const currentPath = getVaultPath();
                const isCustom = customVaultPath !== null;
                
                dialog.showMessageBox(focusedWindow, {
                  type: 'info',
                  title: 'Current Vault Information',
                  message: `Vault Type: ${isCustom ? 'Custom' : 'Default'}`,
                  detail: `Location: ${currentPath}`
                });
              } catch (error) {
                console.error('Error getting vault info:', error);
                dialog.showMessageBox(focusedWindow, {
                  type: 'error',
                  title: 'Error',
                  message: 'Failed to get vault information.',
                  detail: error.message
                });
              }
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'Ctrl+D',
          click: async () => {
            const isDark = await ipcMain.emit('dark-mode:toggle');
            // You can add additional logic here if needed
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  loadCustomVaultPath(); // Initialize custom vault path
  registerIpcHandlers();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
