const path = require('path');
const fs = require('fs');

// Force using the built-in Electron module by filtering out shadowed node_modules
// This is necessary in monorepo environments where require('electron') might return a string path
const originalPaths = module.paths;
module.paths = module.paths.filter(p => p.includes('apps' + path.sep + 'desktop') || !p.includes('node_modules'));

const electron = require('electron');
const { app, BrowserWindow, protocol } = electron;

// Restore paths for subsequent requires if needed
module.paths = originalPaths;

/**
 * Register custom protocol to handle static files correctly
 * This is crucial for Next.js static export (standalone mode)
 */
function registerProtocol() {
  protocol.registerFileProtocol('app', (request, callback) => {
    // Remove query strings and hashes from the URL
    let url = request.url.substring(6); // remove 'app://'
    url = url.split(/[?#]/)[0]; 
    if (url === '' || url === '/') url = 'index.html';

    // Normalize path to handle Windows separators
    const b_path = path.normalize(path.join(__dirname, 'web-dist', url));
    
    // Check if it's a file request with an extension
    const ext = path.extname(b_path);
    
    if (ext) {
      if (fs.existsSync(b_path)) {
        callback({ path: b_path });
      } else {
        // If it's a request for a missing .json file (Next.js prefetch), return a dummy JSON
        if (ext === '.json') {
          callback({ data: Buffer.from('{}'), mimeType: 'application/json' });
        } else {
          callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        }
      }
    } else {
      // It's a directory or a clean URL (SPA routing)
      // First try adding index.html (Next.js trailingSlash: true style)
      const indexPath = path.join(b_path, 'index.html');
      if (fs.existsSync(indexPath)) {
        callback({ path: indexPath });
      } else {
        // Fallback for SPA routing: return the main index.html
        callback({ path: path.join(__dirname, 'web-dist', 'index.html') });
      }
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Required for loading local assets in standalone
    },
    title: "DBMS Platform",
  });

  // Determine URL to load
  const isStandalone = process.env.STANDALONE === 'true';
  
  if (isStandalone) {
    win.loadURL('app://./index.html');
    // Open DevTools by default in standalone to debug the Client-side exception
    win.webContents.openDevTools();
  } else {
    // Development mode
    win.loadURL('http://localhost:3001');
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    app.quit();
  });
}

const { spawn } = require('child_process');
let backendProcess = null;

function spawnBackend() {
  const isStandalone = process.env.STANDALONE === 'true';
  if (!isStandalone) {
    console.log('Development mode: Backend sidecar not spawned automatically. Please run bun run backend:dev.');
    return;
  }

  // Determine backend path (supporting binaries built for Tauri)
  const isWin = process.platform === 'win32';
  if (!isWin) return; // Only handling Windows as per environment

  const binaryName = 'api-x86_64-pc-windows-msvc.exe';
  const unpackedPath = path.join(__dirname, '..', 'app.asar.unpacked', 'api-bin', binaryName);
  const backendPath = fs.existsSync(unpackedPath)
    ? unpackedPath
    : fs.existsSync(path.join(__dirname, 'api-bin', binaryName))
      ? path.join(__dirname, 'api-bin', binaryName)
      : path.join(__dirname, 'src-tauri', 'bin', binaryName);

  if (fs.existsSync(backendPath)) {
    console.log('Spawning backend sidecar:', backendPath);
    backendProcess = spawn(backendPath, [], {
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, PORT: '5000' }
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend sidecar:', err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`Backend sidecar exited with code ${code} and signal ${signal}`);
    });
  } else {
    console.error('Backend sidecar binary not found at:', backendPath);
  }
}

app.whenReady().then(() => {
  registerProtocol();
  spawnBackend();
  createWindow();
});

app.on('quit', () => {
  if (backendProcess) {
    console.log('Killing backend sidecar...');
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
