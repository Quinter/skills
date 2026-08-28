// Action Tracker menu-bar app.
// Embeds site/server.mjs and shows site/index.html in a tray popover.
// The markdown file (~/.claude/action-tracker/actions.md) stays the single
// source of truth — the CLI server, the skill, and this app all share it.

import { app, Tray, BrowserWindow, Menu, nativeImage, shell, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'site')
  : path.join(__dirname, '..', 'site');
const PORT = Number(process.env.ACTION_TRACKER_PORT || 4173);
const URL = `http://127.0.0.1:${PORT}`;

let tray = null;
let win = null;
let serverMod = null;

async function ensureServer() {
  serverMod = await import(pathToFileURL(path.join(SITE_DIR, 'server.mjs')));
  const server = serverMod.startServer(PORT);
  await new Promise((resolve) => {
    // EADDRINUSE means the CLI server is already running — just use it.
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') resolve();
      else throw err;
    });
    server.on('listening', resolve);
  });
}

function outstandingCount() {
  try {
    const sessions = serverMod.parseActions(serverMod.readFileSafe());
    return sessions.flatMap((s) => s.items).filter((i) => !i.checked).length;
  } catch {
    return null;
  }
}

function refreshTitle() {
  if (!tray) return;
  const n = outstandingCount();
  tray.setTitle(n === null ? '☑' : n === 0 ? '☑' : `☑ ${n}`);
}

function createWindow() {
  win = new BrowserWindow({
    width: 440,
    height: 620,
    show: false,
    frame: false,
    resizable: true,
    fullscreenable: false,
    skipTaskbar: true,
  });
  win.loadURL(URL);
  win.on('blur', () => win.hide());
  win.on('closed', () => (win = null));
}

function toggleWindow() {
  if (!win) createWindow();
  if (win.isVisible()) {
    win.hide();
    return;
  }
  // position under the tray icon, clamped to the screen
  const trayBounds = tray.getBounds();
  const { width } = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const x = Math.min(
    Math.max(Math.round(trayBounds.x + trayBounds.width / 2 - width / 2), display.workArea.x),
    display.workArea.x + display.workArea.width - width
  );
  win.setPosition(x, display.workArea.y, false);
  win.show();
  win.focus();
}

app.whenReady().then(async () => {
  if (app.dock) app.dock.hide(); // menu-bar-only
  await ensureServer();

  tray = new Tray(nativeImage.createEmpty());
  refreshTitle();
  tray.on('click', toggleWindow);
  tray.on('right-click', () => {
    tray.popUpContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open in Browser', click: () => shell.openExternal(URL) },
        {
          label: 'Launch at Login',
          type: 'checkbox',
          checked: app.getLoginItemSettings().openAtLogin,
          click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
        },
        { type: 'separator' },
        { label: 'Quit Action Tracker', click: () => app.quit() },
      ])
    );
  });

  // keep the badge count fresh: watch the file's directory (editors replace
  // files, which breaks direct watches) plus a slow poll as fallback
  try {
    fs.watch(path.dirname(serverMod.ACTIONS_FILE), refreshTitle);
  } catch {}
  setInterval(refreshTitle, 15000);

  console.log(`Action Tracker menu-bar app ready: ${URL}`);
});

app.on('window-all-closed', (e) => e.preventDefault()); // tray apps live on
