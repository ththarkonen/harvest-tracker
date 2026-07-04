const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("harvestApi", {
  listSeries: () => ipcRenderer.invoke("series:list"),
  getSeries: (id) => ipcRenderer.invoke("series:get", id),
  createSeries: (payload) => ipcRenderer.invoke("series:create", payload),
  importSeason: () => ipcRenderer.invoke("series:import"),
  exportSeason: (id) => ipcRenderer.invoke("series:export", id),
  addCategory: (seriesId, payload) => ipcRenderer.invoke("category:add", seriesId, payload),
  updateCategory: (seriesId, categoryId, payload) =>
    ipcRenderer.invoke("category:update", seriesId, categoryId, payload),
  deleteCategory: (seriesId, categoryId) => ipcRenderer.invoke("category:delete", seriesId, categoryId),
  addEntry: (seriesId, payload) => ipcRenderer.invoke("entry:add", seriesId, payload),
  deleteEntry: (seriesId, entryId) => ipcRenderer.invoke("entry:delete", seriesId, entryId),
  addWaterUsage: (seriesId, payload) => ipcRenderer.invoke("water-usage:add", seriesId, payload)
});
