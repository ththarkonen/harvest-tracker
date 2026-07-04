const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_UNIT_SETTINGS = {
  system: "si",
  inputWeightUnit: "g",
  displayWeightUnit: "g",
  displayPrecision: 0
};

const WEIGHT_UNITS = {
  g: { system: "si" },
  kg: { system: "si" },
  oz: { system: "imperial" },
  lb: { system: "imperial" }
};

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.name = "ValidationError";
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isSafeId(id) {
  return /^[a-z0-9][a-z0-9-]*$/.test(id || "");
}

function nowIso() {
  return new Date().toISOString();
}

function roundNumber(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultUnitSettings(system = DEFAULT_UNIT_SETTINGS.system) {
  return {
    ...DEFAULT_UNIT_SETTINGS,
    system,
    inputWeightUnit: system === "imperial" ? "oz" : "g",
    displayWeightUnit: system === "imperial" ? "oz" : "g"
  };
}

function normalizeUnitSettings(raw = {}) {
  raw = raw || {};
  const requestedSystem = raw?.system === "imperial" ? "imperial" : "si";
  const defaults = defaultUnitSettings(requestedSystem);
  const inputWeightUnit =
    WEIGHT_UNITS[raw?.inputWeightUnit]?.system === requestedSystem
      ? raw.inputWeightUnit
      : defaults.inputWeightUnit;
  const displayWeightUnit =
    WEIGHT_UNITS[raw?.displayWeightUnit]?.system === requestedSystem
      ? raw.displayWeightUnit
      : defaults.displayWeightUnit;
  const precision = Number(raw?.displayPrecision);

  return {
    system: requestedSystem,
    inputWeightUnit,
    displayWeightUnit,
    displayPrecision: Number.isInteger(precision) ? Math.max(0, Math.min(3, precision)) : defaults.displayPrecision
  };
}

function roundValuePerGram(value) {
  return Math.round(Number(value) * 1000000000) / 1000000000;
}

function normalizeValuePerGram(valuePerGram, legacyValuePerKg, { strict = false } = {}) {
  if (
    (valuePerGram === undefined || valuePerGram === null || String(valuePerGram).trim() === "") &&
    (legacyValuePerKg === undefined || legacyValuePerKg === null || String(legacyValuePerKg).trim() === "")
  ) {
    return null;
  }

  const amount =
    valuePerGram !== undefined && valuePerGram !== null && String(valuePerGram).trim() !== ""
      ? roundValuePerGram(valuePerGram)
      : roundValuePerGram(Number(legacyValuePerKg) / 1000);
  if (Number.isFinite(amount) && amount >= 0) {
    return amount;
  }

  if (strict) {
    throw new ValidationError("Monetary value must be zero or greater");
  }
  return null;
}

function normalizeCategory(raw, existingIds = new Set()) {
  const name = String(raw?.name || "").trim();
  if (!name) {
    throw new ValidationError("Category name is required");
  }

  let id = slugify(raw?.id || name);
  if (!id) {
    throw new ValidationError("Category id could not be generated");
  }

  let suffix = 2;
  const baseId = id;
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const color = /^#[0-9a-fA-F]{6}$/.test(raw?.color || "") ? raw.color : "#3f7f5f";

  return {
    id,
    name,
    icon: String(raw?.icon || "lucide:leaf"),
    color,
    countLabel: String(raw?.countLabel || "items").trim() || "items",
    valuePerGram: normalizeValuePerGram(raw?.valuePerGram, raw?.valuePerKg, { strict: true }),
    weightSettings: normalizeUnitSettings(raw?.weightSettings)
  };
}

function normalizeCategoryUpdate(raw, current) {
  const name = String(raw?.name || "").trim();
  if (!name) {
    throw new ValidationError("Category name is required");
  }

  const color = /^#[0-9a-fA-F]{6}$/.test(raw?.color || "") ? raw.color : current.color || "#3f7f5f";
  const hasValueUpdate =
    Object.prototype.hasOwnProperty.call(raw || {}, "valuePerGram") ||
    Object.prototype.hasOwnProperty.call(raw || {}, "valuePerKg");
  const valuePerGram = hasValueUpdate
    ? normalizeValuePerGram(raw?.valuePerGram, raw?.valuePerKg, { strict: true })
    : normalizeValuePerGram(current?.valuePerGram, current?.valuePerKg);
  const { valuePerKg: _legacyValuePerKg, valuePerGram: _currentValuePerGram, ...currentFields } = current;

  return {
    ...currentFields,
    name,
    icon: String(raw?.icon || current.icon || "lucide:leaf"),
    color,
    countLabel: String(raw?.countLabel || current.countLabel || "items").trim() || "items",
    valuePerGram,
    weightSettings: normalizeUnitSettings(raw?.weightSettings || current.weightSettings)
  };
}

function normalizeStoredCategory(category) {
  const { valuePerKg: legacyValuePerKg, valuePerGram, ...categoryFields } = category || {};
  return {
    ...categoryFields,
    valuePerGram: normalizeValuePerGram(valuePerGram, legacyValuePerKg),
    weightSettings: normalizeUnitSettings(category?.weightSettings)
  };
}

function normalizeStoredWaterUsageEntry(entry) {
  const timestamp = String(entry?.timestamp || "").trim();
  const liters = roundNumber(entry?.liters);
  if (!timestamp || Number.isNaN(Date.parse(timestamp)) || !Number.isFinite(liters) || liters <= 0) {
    return null;
  }

  return {
    id: String(entry?.id || createId("water")),
    timestamp,
    liters,
    note: String(entry?.note || "").trim()
  };
}

function normalizeSeries(series) {
  return {
    ...series,
    categories: Array.isArray(series.categories) ? series.categories.map(normalizeStoredCategory) : [],
    entries: Array.isArray(series.entries) ? series.entries : [],
    waterUsage: Array.isArray(series.waterUsage)
      ? series.waterUsage.map(normalizeStoredWaterUsageEntry).filter(Boolean)
      : []
  };
}

function summarizeSeries(series) {
  const normalized = normalizeSeries(series);
  const entries = normalized.entries;
  const waterUsage = normalized.waterUsage;

  return {
    id: normalized.id,
    name: normalized.name,
    year: normalized.year,
    unit: normalized.unit || "grams",
    categories: normalized.categories,
    entryCount: entries.length,
    totalGrams: roundNumber(entries.reduce((sum, entry) => sum + Number(entry.grams || 0), 0)),
    totalCount: entries.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
    waterUsageCount: waterUsage.length,
    totalWaterLiters: roundNumber(waterUsage.reduce((sum, entry) => sum + Number(entry.liters || 0), 0)),
    created_at: normalized.created_at,
    updated_at: normalized.updated_at
  };
}

function validateEntry(payload, series) {
  const categoryId = String(payload?.categoryId || "").trim();
  const category = series.categories.find((candidate) => candidate.id === categoryId);
  if (!category) {
    throw new ValidationError("Category must exist before saving an entry");
  }

  const timestamp = String(payload?.timestamp || "").trim();
  const parsedTimestamp = Date.parse(timestamp);
  if (!timestamp || Number.isNaN(parsedTimestamp)) {
    throw new ValidationError("Timestamp must be a valid ISO date");
  }
  const timestampYear = Number((timestamp.match(/^(\d{4})/) || [])[1]);

  const entryMode = payload?.entryMode === "individual" ? "individual" : "batch";
  let grams;
  let count;
  let itemWeights = null;

  if (entryMode === "individual") {
    if (!Array.isArray(payload?.itemWeights) || payload.itemWeights.length === 0) {
      throw new ValidationError("At least one individual item weight is required");
    }
    itemWeights = payload.itemWeights.map((value) => roundNumber(value));
    const invalidWeight = itemWeights.find((value) => !Number.isFinite(value) || value <= 0);
    if (invalidWeight !== undefined) {
      throw new ValidationError("Every item weight must be greater than 0");
    }
    grams = roundNumber(itemWeights.reduce((sum, value) => sum + value, 0));
    count = itemWeights.length;
  } else {
    grams = roundNumber(payload?.grams);
    count = Number(payload?.count);
    if (!Number.isFinite(grams) || grams <= 0) {
      throw new ValidationError("Weight must be greater than 0");
    }
    if (!Number.isInteger(count) || count <= 0) {
      throw new ValidationError("Quantity must be a positive integer");
    }
  }

  const warning =
    Number.isInteger(timestampYear) && timestampYear !== Number(series.year)
      ? `Timestamp year differs from selected series year ${series.year}`
      : null;

  return {
    entry: {
      id: createId("entry"),
      timestamp,
      categoryId,
      grams,
      count,
      itemWeights,
      entryMode,
      note: String(payload?.note || "").trim()
    },
    warning
  };
}

function validateWaterUsage(payload) {
  const timestamp = String(payload?.timestamp || "").trim();
  const parsedTimestamp = Date.parse(timestamp);
  if (!timestamp || Number.isNaN(parsedTimestamp)) {
    throw new ValidationError("Timestamp must be a valid ISO date");
  }

  const liters = roundNumber(payload?.liters);
  if (!Number.isFinite(liters) || liters <= 0) {
    throw new ValidationError("Water usage must be greater than 0 liters");
  }

  return {
    id: createId("water"),
    timestamp,
    liters,
    note: String(payload?.note || "").trim()
  };
}

function normalizeImportedEntry(raw, categoryIds) {
  const categoryId = String(raw?.categoryId || "").trim();
  if (!categoryIds.has(categoryId)) {
    throw new ValidationError("Imported harvest entry uses an unknown category");
  }

  const timestamp = String(raw?.timestamp || "").trim();
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
    throw new ValidationError("Imported harvest entry has an invalid timestamp");
  }

  const entryMode = raw?.entryMode === "individual" ? "individual" : "batch";
  const grams = roundNumber(raw?.grams);
  const count = Number(raw?.count);
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new ValidationError("Imported harvest entry has an invalid weight");
  }
  if (!Number.isInteger(count) || count <= 0) {
    throw new ValidationError("Imported harvest entry has an invalid quantity");
  }

  let itemWeights = null;
  if (entryMode === "individual") {
    if (!Array.isArray(raw?.itemWeights) || !raw.itemWeights.length) {
      throw new ValidationError("Imported individual harvest entry is missing item weights");
    }
    itemWeights = raw.itemWeights.map((value) => roundNumber(value));
    if (itemWeights.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new ValidationError("Imported individual harvest entry has invalid item weights");
    }
  }

  return {
    id: String(raw?.id || createId("entry")),
    timestamp,
    categoryId,
    grams,
    count,
    itemWeights,
    entryMode,
    note: String(raw?.note || "").trim()
  };
}

function normalizeImportedWaterUsageEntry(raw) {
  const timestamp = String(raw?.timestamp || "").trim();
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
    throw new ValidationError("Imported water usage entry has an invalid timestamp");
  }

  const liters = roundNumber(raw?.liters);
  if (!Number.isFinite(liters) || liters <= 0) {
    throw new ValidationError("Imported water usage entry has an invalid amount");
  }

  return {
    id: String(raw?.id || createId("water")),
    timestamp,
    liters,
    note: String(raw?.note || "").trim()
  };
}

function createSeriesStore({ dataDir }) {
  function seriesPath(id) {
    if (!isSafeId(id)) {
      throw new Error("Invalid series id");
    }
    return path.join(dataDir, `${id}.json`);
  }

  async function uniqueSeriesId(baseId) {
    const base = slugify(baseId) || "season";
    let id = base;
    let suffix = 2;

    for (;;) {
      try {
        await fs.access(seriesPath(id));
        id = `${base}-${suffix}`;
        suffix += 1;
      } catch (error) {
        if (error.code === "ENOENT") {
          return id;
        }
        throw error;
      }
    }
  }

  async function ensureDirectories() {
    await fs.mkdir(dataDir, { recursive: true });
  }

  async function readSeries(id) {
    const file = seriesPath(id);
    const raw = await fs.readFile(file, "utf8");
    return normalizeSeries(JSON.parse(raw));
  }

  async function writeSeries(series) {
    await ensureDirectories();
    const file = seriesPath(series.id);
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(series, null, 2)}\n`, "utf8");
    await fs.rename(tmp, file);
  }

  async function listSeries() {
    await ensureDirectories();
    const files = await fs.readdir(dataDir);
    const series = [];

    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }

      try {
        const id = file.replace(/\.json$/, "");
        series.push(summarizeSeries(await readSeries(id)));
      } catch {
        // Ignore invalid files so one bad JSON document does not break the app.
      }
    }

    return series.sort((a, b) => {
      if (b.year !== a.year) {
        return Number(b.year || 0) - Number(a.year || 0);
      }
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });
  }

  async function createSeries(payload) {
    const name = String(payload?.name || "").trim();
    const year = Number(payload?.year);

    if (!name) {
      throw new ValidationError("Series name is required");
    }
    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      throw new ValidationError("Year must be an integer between 1900 and 3000");
    }

    const yearText = String(year);
    let id = slugify(name);
    if (!id.includes(yearText)) {
      id = slugify(`${id}-${yearText}`);
    }
    if (!id) {
      throw new ValidationError("Series id could not be generated");
    }

    try {
      await fs.access(seriesPath(id));
      throw new ValidationError("A time series with this name/year already exists");
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const existingIds = new Set();
    const categories = Array.isArray(payload?.categories)
      ? payload.categories.map((category) => {
          const normalized = normalizeCategory(category, existingIds);
          existingIds.add(normalized.id);
          return normalized;
        })
      : [];

    const timestamp = nowIso();
    const series = {
      id,
      name,
      year,
      unit: "grams",
      categories,
      entries: [],
      waterUsage: [],
      created_at: timestamp,
      updated_at: timestamp
    };

    await writeSeries(series);
    return series;
  }

  async function importSeries(payload) {
    const name = String(payload?.name || "").trim();
    const year = Number(payload?.year);
    if (!name) {
      throw new ValidationError("Imported season name is required");
    }
    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      throw new ValidationError("Imported season year must be an integer between 1900 and 3000");
    }

    const existingIds = new Set();
    const categories = Array.isArray(payload?.categories)
      ? payload.categories.map((category) => {
          const normalized = normalizeCategory(category, existingIds);
          existingIds.add(normalized.id);
          return normalized;
        })
      : [];
    const categoryIds = new Set(categories.map((category) => category.id));
    const entries = Array.isArray(payload?.entries)
      ? payload.entries.map((entry) => normalizeImportedEntry(entry, categoryIds))
      : [];
    const waterUsage = Array.isArray(payload?.waterUsage)
      ? payload.waterUsage.map(normalizeImportedWaterUsageEntry)
      : [];
    const timestamp = nowIso();
    const id = await uniqueSeriesId(payload?.id || `${name}-${year}`);
    const createdAt = Date.parse(payload?.created_at) ? payload.created_at : timestamp;

    const series = {
      id,
      name,
      year,
      unit: "grams",
      categories,
      entries,
      waterUsage,
      created_at: createdAt,
      updated_at: timestamp
    };

    await writeSeries(series);
    return series;
  }

  async function addCategory(id, payload) {
    const series = await readSeries(id);
    const existingIds = new Set(series.categories.map((category) => category.id));
    const category = normalizeCategory(payload, existingIds);
    series.categories.push(category);
    series.updated_at = nowIso();
    await writeSeries(series);
    return { category, series };
  }

  async function updateCategory(id, categoryId, payload) {
    const series = await readSeries(id);
    const categoryIndex = series.categories.findIndex((category) => category.id === categoryId);
    if (categoryIndex === -1) {
      throw new ResourceNotFoundError("Category was not found");
    }

    const category = normalizeCategoryUpdate(payload, series.categories[categoryIndex]);
    series.categories[categoryIndex] = category;
    series.updated_at = nowIso();
    await writeSeries(series);
    return { category, series };
  }

  async function deleteCategory(id, categoryId) {
    const series = await readSeries(id);
    const beforeCategories = series.categories.length;
    const beforeEntries = series.entries.length;
    series.categories = series.categories.filter((category) => category.id !== categoryId);
    if (series.categories.length === beforeCategories) {
      throw new ResourceNotFoundError("Category was not found");
    }

    series.entries = series.entries.filter((entry) => entry.categoryId !== categoryId);
    series.updated_at = nowIso();
    await writeSeries(series);
    return {
      series,
      removedEntryCount: beforeEntries - series.entries.length
    };
  }

  async function addEntry(id, payload) {
    const series = await readSeries(id);
    const { entry, warning } = validateEntry(payload, series);
    series.entries.push(entry);
    series.updated_at = nowIso();
    await writeSeries(series);
    return { entry, series, warning };
  }

  async function addWaterUsage(id, payload) {
    const series = await readSeries(id);
    const entry = validateWaterUsage(payload);
    series.waterUsage.push(entry);
    series.updated_at = nowIso();
    await writeSeries(series);
    return { entry, series };
  }

  async function deleteEntry(id, entryId) {
    const series = await readSeries(id);
    const before = series.entries.length;
    series.entries = series.entries.filter((entry) => entry.id !== entryId);
    if (series.entries.length === before) {
      throw new ResourceNotFoundError("Entry was not found");
    }
    series.updated_at = nowIso();
    await writeSeries(series);
    return { series };
  }

  return {
    ensureDirectories,
    getSeries: readSeries,
    listSeries,
    createSeries,
    importSeries,
    addCategory,
    updateCategory,
    deleteCategory,
    addEntry,
    deleteEntry,
    addWaterUsage
  };
}

class ResourceNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResourceNotFoundError";
    this.code = "ENOENT";
  }
}

module.exports = {
  ResourceNotFoundError,
  ValidationError,
  createSeriesStore,
  isSafeId
};
