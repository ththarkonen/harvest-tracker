const path = require("node:path");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const { createSeriesStore } = require("../server/series-store");

const DISPLAY_NAME = "Harvest tracker";

let mainWindow = null;
let store = null;

app.setName(DISPLAY_NAME);

function registerIpc() {
  ipcMain.handle("series:list", async () => ({ series: await store.listSeries() }));
  ipcMain.handle("series:get", async (_event, id) => ({ series: await store.getSeries(id) }));
  ipcMain.handle("series:create", async (_event, payload) => ({ series: await store.createSeries(payload) }));
  ipcMain.handle("series:import", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import season",
      properties: ["openFile"],
      filters: [{ name: "JSON files", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const raw = await fs.readFile(result.filePaths[0], "utf8");
    return { series: await store.importSeries(JSON.parse(raw)) };
  });
  ipcMain.handle("series:export", async (_event, id) => {
    const series = await store.getSeries(id);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export season",
      defaultPath: `${series.id}.json`,
      filters: [{ name: "JSON files", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    await fs.writeFile(result.filePath, `${JSON.stringify(series, null, 2)}\n`, "utf8");
    return { saved: true };
  });
  ipcMain.handle("category:add", async (_event, seriesId, payload) => store.addCategory(seriesId, payload));
  ipcMain.handle("category:update", async (_event, seriesId, categoryId, payload) =>
    store.updateCategory(seriesId, categoryId, payload)
  );
  ipcMain.handle("category:delete", async (_event, seriesId, categoryId) =>
    store.deleteCategory(seriesId, categoryId)
  );
  ipcMain.handle("entry:add", async (_event, seriesId, payload) => store.addEntry(seriesId, payload));
  ipcMain.handle("entry:delete", async (_event, seriesId, entryId) => store.deleteEntry(seriesId, entryId));
  ipcMain.handle("water-usage:add", async (_event, seriesId, payload) => store.addWaterUsage(seriesId, payload));
}

function createWindow() {
  const icon = resolveAppIcon();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: DISPLAY_NAME,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function resolveAppIcon() {
  const candidates = process.env.ELECTRON_RENDERER_URL
    ? [
        path.join(__dirname, "..", "public", "app-icon.png"),
        path.join(__dirname, "..", "dist", "app-icon.png"),
        path.join(__dirname, "..", "public", "favicon.svg"),
        path.join(__dirname, "..", "dist", "favicon.svg")
      ]
    : [
        path.join(__dirname, "..", "dist", "app-icon.png"),
        path.join(__dirname, "..", "public", "app-icon.png"),
        path.join(__dirname, "..", "dist", "favicon.svg"),
        path.join(__dirname, "..", "public", "favicon.svg")
      ];

  return candidates.find((candidate) => fsSync.existsSync(candidate)) || null;
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  store = createSeriesStore({ dataDir: path.join(app.getPath("userData"), "data") });
  await store.ensureDirectories();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
