const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

if (process.env.UU_TEST_USER_DATA_DIR) {
  app.setPath("userData", process.env.UU_TEST_USER_DATA_DIR);
}

let mainWindow;
let tray;
let quitting = false;
let alwaysOnTop = false;

function assetPath(name) {
  return path.join(__dirname, "..", "build", name);
}

function recordExecutablePath() {
  if (!app.isPackaged) return;
  try {
    const localAppData = process.env.LOCALAPPDATA || app.getPath("appData");
    const locatorDirectory = path.join(localAppData, "UU小园");
    fs.mkdirSync(locatorDirectory, { recursive: true });
    fs.writeFileSync(path.join(locatorDirectory, "install-path.txt"), process.execPath, "utf8");
  } catch {
    // The updater also searches common folders, so a read-only location is not fatal.
  }
}

function applyTopmost() {
  if (!mainWindow) return false;
  mainWindow.setAlwaysOnTop(alwaysOnTop, "normal");
  if (alwaysOnTop) mainWindow.moveTop();
  return mainWindow.isAlwaysOnTop();
}

function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.setSkipTaskbar(false);
  mainWindow.restore();
  applyTopmost();
  mainWindow.focus();
}

function createTray() {
  const image = nativeImage.createFromPath(assetPath("icon.png")).resize({ width: 24, height: 24 });
  tray = new Tray(image);
  tray.setToolTip("UU小园");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "打开田园", click: showWindow },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        quitting = true;
        app.quit();
      }
    }
  ]));
  tray.on("click", showWindow);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 560,
    minWidth: 680,
    minHeight: 500,
    title: "UU小园",
    icon: assetPath("icon.png"),
    backgroundColor: "#92d2ca",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    mainWindow.hide();
    mainWindow.setSkipTaskbar(true);
  });
  mainWindow.on("close", () => {
    if (!quitting) mainWindow.webContents.send("app-closing");
  });
}

app.whenReady().then(() => {
  recordExecutablePath();
  createTray();
  createWindow();
});

app.on("before-quit", () => {
  quitting = true;
});

app.on("window-all-closed", () => app.quit());

ipcMain.handle("set-always-on-top", (_event, enabled) => {
  alwaysOnTop = Boolean(enabled);
  return applyTopmost();
});
