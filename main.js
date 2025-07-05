const { app, BrowserWindow, ipcMain, nativeTheme, Menu, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.ELECTRON_IS_DEV === 'true';

// Enable live reload for Electron in development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
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
  ipcMain.handle('vault:read-file', async (event, filename) => {
    try {
      let vaultPath;
      if (isDev) {
        vaultPath = path.join(__dirname, 'public', 'vault');
      } else {
        vaultPath = path.join(process.resourcesPath, 'vault');
      }
      
      const filePath = path.join(vaultPath, filename);
      console.log('Reading vault file:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filename} at ${filePath}`);
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`Successfully read file ${filename}, content length: ${content.length}`);
      return content;
    } catch (error) {
      console.error('Error reading vault file:', error);
      return null;
    }
  });

  // Handle vault image requests - return as base64 data URL
  ipcMain.handle('vault:read-image', async (event, filename) => {
    try {
      let vaultPath;
      if (isDev) {
        vaultPath = path.join(__dirname, 'public', 'vault');
      } else {
        vaultPath = path.join(process.resourcesPath, 'vault');
      }
      
      const filePath = path.join(vaultPath, filename);
      console.log('Reading vault image:', filePath);
      
      if (!fs.existsSync(filePath)) {
        console.error(`Image not found: ${filename} at ${filePath}`);
        return null;
      }
      
      const imageBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'image/jpeg'; // default
      
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
      }
      
      const base64 = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      console.log(`Successfully read image ${filename}, size: ${imageBuffer.length} bytes`);
      return dataUrl;
    } catch (error) {
      console.error('Error reading vault image:', error);
      return null;
    }
  });

  // Handle vault file listing with metadata
  ipcMain.handle('vault:list-files', async () => {
    try {
      let vaultPath;
      if (isDev) {
        vaultPath = path.join(__dirname, 'public', 'vault');
      } else {
        vaultPath = path.join(process.resourcesPath, 'vault');
      }
      
      console.log('Listing vault files from:', vaultPath);
      console.log('isDev:', isDev);
      console.log('process.resourcesPath:', process.resourcesPath);
      
      if (!fs.existsSync(vaultPath)) {
        console.error('Vault directory does not exist:', vaultPath);
        // Try alternative paths
        const altPaths = [
          path.join(__dirname, 'vault'),
          path.join(__dirname, 'public', 'vault'),
          path.join(__dirname, '..', 'vault'),
          path.join(process.cwd(), 'vault')
        ];
        
        for (const altPath of altPaths) {
          console.log('Trying alternative path:', altPath);
          if (fs.existsSync(altPath)) {
            console.log('Found vault at alternative path:', altPath);
            vaultPath = altPath;
            break;
          }
        }
        
        if (!fs.existsSync(vaultPath)) {
          console.error('Could not find vault directory in any location');
          return [];
        }
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
            displayName: file.replace('.md', '').replace(/-/g, ' '),
            createdTime: stats.birthtime || stats.ctime, // Use birthtime if available, fallback to ctime
            modifiedTime: stats.mtime,
            size: stats.size
          };
        } catch (error) {
          console.error(`Error getting stats for file ${file}:`, error);
          return {
            filename: file,
            displayName: file.replace('.md', '').replace(/-/g, ' '),
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
    win.loadURL('http://localhost:3001');
    win.webContents.openDevTools();
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
          label: 'Exit',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
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
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // You can show an about dialog here
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
