const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Register custom scheme 'app' as standard and secure
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load index.html using the custom protocol
  mainWindow.loadURL('app://local/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle local file serving and SPA routing
app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    // Extract the relative path from the request URL
    let urlPath = request.url.slice('app://local/'.length);
    // Remove query params or hash parameters
    const cleanPath = urlPath.split(/[?#]/)[0];
    
    // Resolve absolute path in the dist/pos-admin/browser directory
    let filePath = path.join(__dirname, 'dist/pos-admin/browser', cleanPath);
    
    try {
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        // Fallback to index.html for SPA client-side routing
        filePath = path.join(__dirname, 'dist/pos-admin/browser/index.html');
      }
    } catch {
      // If file does not exist, fallback to index.html (SPA routing)
      filePath = path.join(__dirname, 'dist/pos-admin/browser/index.html');
    }
    
    // Fetch and return the file content
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
