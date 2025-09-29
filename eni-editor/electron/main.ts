import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';

// Start Next/Express server within the Electron main process
async function startServer(): Promise<void> {
  const serverModule = await import(pathToFileURL(path.join(process.cwd(), 'server.js')).toString());
  if (serverModule && typeof serverModule.start === 'function') {
    await serverModule.start();
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const targetUrl = process.env.ELECTRON_APP_URL || 'http://localhost:8080/';
  await win.loadURL(targetUrl);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(async () => {
  try {
    await startServer();
    await createWindow();
  } catch (err: any) {
    const message = err?.stack || String(err);
    console.error('Failed to start Electron app:', message);
    dialog.showErrorBox('ENI-Editor Error', message);
    app.quit();
  }
});
