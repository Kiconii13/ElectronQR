const { app, BrowserWindow, ipcMain, dialog, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 800,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, "static", "ElectronQR.png")
  });

  win.loadFile("index.html");
}

// Save dialog handler
ipcMain.handle("save-dialog", async (_, buffer) => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: "PNG Image", extensions: ["png"] }],
    defaultPath: "qr.png"
  });

  if (filePath) {
    fs.writeFileSync(filePath, buffer);
    return true;
  }
  return false;
});

const HISTORY_PATH = path.join(__dirname, "history.json");

ipcMain.handle("history-load", () => {
  const content = fs.readFileSync(HISTORY_PATH, "utf8");
  return JSON.parse(content);
});

ipcMain.handle("history-add", (_, entry) => {
  const content = fs.readFileSync(HISTORY_PATH, "utf8");
  const json = JSON.parse(content);

  json.unshift(entry); // newest first

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(json, null, 2));
  return true;
});

ipcMain.handle("history-set", async (_, entries) => {
  const filePath = path.join(__dirname, "history.json");
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
});

// Window control buttons
ipcMain.on("window-minimize", () => {
  win.minimize();
});

ipcMain.on("window-maximize", () => {
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on("window-close", () => {
  win.close();
});

app.whenReady().then(createWindow);
