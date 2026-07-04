async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  return payload;
}

function electronApi() {
  return window.harvestApi || null;
}

export const seriesRepository = {
  async listSeries() {
    const electron = electronApi();
    if (electron) {
      return electron.listSeries();
    }
    return apiRequest("/api/series");
  },

  async getSeries(id) {
    const electron = electronApi();
    if (electron) {
      return electron.getSeries(id);
    }
    return apiRequest(`/api/series/${encodeURIComponent(id)}`);
  },

  async createSeries(payload) {
    const electron = electronApi();
    if (electron) {
      return electron.createSeries(payload);
    }
    return apiRequest("/api/series", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async importSeason(payload) {
    const electron = electronApi();
    if (electron) {
      return electron.importSeason();
    }
    return apiRequest("/api/series/import", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async exportSeason(series) {
    const electron = electronApi();
    if (electron) {
      return electron.exportSeason(series.id);
    }

    const json = `${JSON.stringify(series, null, 2)}\n`;
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${series.id}.json`,
        types: [
          {
            description: "JSON files",
            accept: { "application/json": [".json"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return { saved: true };
    }

    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${series.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return { saved: true };
  },

  async addCategory(seriesId, payload) {
    const electron = electronApi();
    if (electron) {
      return electron.addCategory(seriesId, payload);
    }
    return apiRequest(`/api/series/${encodeURIComponent(seriesId)}/categories`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async updateCategory(seriesId, categoryId, payload) {
    const electron = electronApi();
    if (electron) {
      return electron.updateCategory(seriesId, categoryId, payload);
    }
    return apiRequest(
      `/api/series/${encodeURIComponent(seriesId)}/categories/${encodeURIComponent(categoryId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      }
    );
  },

  async deleteCategory(seriesId, categoryId) {
    const electron = electronApi();
    if (electron) {
      return electron.deleteCategory(seriesId, categoryId);
    }
    return apiRequest(
      `/api/series/${encodeURIComponent(seriesId)}/categories/${encodeURIComponent(categoryId)}`,
      { method: "DELETE" }
    );
  },

  async addEntry(seriesId, payload) {
    const electron = electronApi();
    if (electron) {
      return electron.addEntry(seriesId, payload);
    }
    return apiRequest(`/api/series/${encodeURIComponent(seriesId)}/entries`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async addWaterUsage(seriesId, payload) {
    const electron = electronApi();
    if (electron) {
      return electron.addWaterUsage(seriesId, payload);
    }
    return apiRequest(`/api/series/${encodeURIComponent(seriesId)}/water-usage`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async deleteEntry(seriesId, entryId) {
    const electron = electronApi();
    if (electron) {
      return electron.deleteEntry(seriesId, entryId);
    }
    return apiRequest(
      `/api/series/${encodeURIComponent(seriesId)}/entries/${encodeURIComponent(entryId)}`,
      { method: "DELETE" }
    );
  }
};
