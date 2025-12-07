const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess = null;
const isDev = process.env.NODE_ENV === 'development';

// Server configuration
let serverConfig = {
  enabled: false,
  port: 3000,
  dataDir: path.join(app.getPath('userData'), 'tandem-data'),
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Tandem',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Server Settings...',
          click: () => {
            mainWindow.webContents.send('open-settings');
          },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Start embedded server
function startServer() {
  if (serverProcess) {
    console.log('Server already running');
    return;
  }

  const serverPath = path.join(__dirname, '../server/index.ts');

  serverProcess = spawn('npx', ['tsx', serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: serverConfig.port.toString(),
      TANDEM_DATA_DIR: serverConfig.dataDir,
    },
    cwd: path.join(__dirname, '..'),
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
    if (mainWindow) {
      mainWindow.webContents.send('server-log', data.toString());
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    serverProcess = null;
    if (mainWindow) {
      mainWindow.webContents.send('server-stopped');
    }
  });

  return true;
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// IPC handlers
ipcMain.handle('start-server', async () => {
  return startServer();
});

ipcMain.handle('stop-server', async () => {
  stopServer();
  return true;
});

ipcMain.handle('get-server-status', async () => {
  return {
    running: serverProcess !== null,
    config: serverConfig,
  };
});

ipcMain.handle('set-server-config', async (event, config) => {
  serverConfig = { ...serverConfig, ...config };
  return serverConfig;
});

ipcMain.handle('select-data-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Data Directory',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});
