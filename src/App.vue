<template>
  <div class="app-shell">
    <Sidebar
      :t="t"
      :series-list="state.seriesList"
      :active-series="state.activeSeries"
      :hidden-category-ids="state.hiddenCategoryIds"
      :category-totals="categoryTotals"
      :format-weight="formatWeightForCategory"
      :format-category-value="formatCategoryValue"
      @select-series="loadSeries"
      @new-series="modals.newSeries = true"
      @import-season="importSeason"
      @export-season="exportSeason"
      @add-category="openNewCategory"
      @edit-category="openEditCategory"
      @delete-category="openDeleteCategory"
      @toggle-category="toggleCategoryVisibility"
      @add-water-usage="openWaterUsageModal"
      @add-harvest="openHarvestModal"
    />

    <Dashboard
      :active-series="state.activeSeries"
      :visible-categories="visibleCategories"
      :language="state.language"
      :language-options="languageOptions"
      :t="t"
      :format-weight="formatWeightForCategory"
      :format-water="formatWater"
      :format-date="formatDate"
      @language-change="setLanguage"
      @delete-entry="openDeleteEntry"
    />

    <NewSeriesModal
      :open="modals.newSeries"
      :t="t"
      @close="modals.newSeries = false"
      @submit="createSeries"
    />

    <CategoryModal
      :open="modals.category"
      :category="editingCategory"
      :t="t"
      :currency-symbol="currencySymbol"
      @close="closeCategoryModal"
      @submit="saveCategory"
    />

    <HarvestModal
      :open="modals.harvest"
      :categories="state.activeSeries?.categories || []"
      :selected-category-id="state.selectedCategoryId"
      :t="t"
      :format-weight="formatWeightForCategory"
      @close="modals.harvest = false"
      @error="showError"
      @submit="saveHarvest"
    />

    <WaterUsageModal
      :open="modals.waterUsage"
      :t="t"
      @close="modals.waterUsage = false"
      @error="showError"
      @submit="saveWaterUsage"
    />

    <ConfirmModal
      :open="modals.deleteEntry"
      :eyebrow="t('deleteEntry')"
      :title="t('deleteHarvestEntryQuestion')"
      title-id="deleteEntryTitle"
      :close-label="t('close')"
      :cancel-label="t('cancel')"
      :confirm-label="t('deleteEntry')"
      :message="t('deleteConfirmCopy')"
      :summary-html="deleteEntrySummary"
      @close="closeDeleteEntry"
      @confirm="deleteEntry"
    />

    <ConfirmModal
      :open="modals.deleteCategory"
      :eyebrow="t('deleteCategory')"
      :title="t('deleteCategoryQuestion')"
      title-id="deleteCategoryTitle"
      :close-label="t('close')"
      :cancel-label="t('cancel')"
      :confirm-label="t('deleteCategory')"
      :message="t('deleteCategoryConfirmCopy')"
      :summary-html="deleteCategorySummary"
      @close="closeDeleteCategory"
      @confirm="deleteCategory"
    />

    <div v-if="toast.message" :class="['toast', { error: toast.type === 'error' }]" role="status">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, watch } from "vue";
import ConfirmModal from "./components/ConfirmModal.vue";
import CategoryModal from "./components/CategoryModal.vue";
import Dashboard from "./components/Dashboard.vue";
import HarvestModal from "./components/HarvestModal.vue";
import NewSeriesModal from "./components/NewSeriesModal.vue";
import Sidebar from "./components/Sidebar.vue";
import WaterUsageModal from "./components/WaterUsageModal.vue";
import { LANGUAGE_STORAGE_KEY, VISIBILITY_STORAGE_PREFIX } from "./domain/catalog";
import { formatDateTime } from "./domain/dates";
import { escapeHtml } from "./domain/text";
import {
  languageConfig,
  normalizeLanguage,
  supportedLanguageCodes,
  translate
} from "./domain/translations";
import { formatWeight } from "./domain/units";
import { seriesRepository } from "./repositories/seriesRepository";

const state = reactive({
  seriesList: [],
  activeSeries: null,
  language: normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en"),
  selectedCategoryId: null,
  hiddenCategoryIds: new Set()
});

const modals = reactive({
  newSeries: false,
  category: false,
  harvest: false,
  waterUsage: false,
  deleteEntry: false,
  deleteCategory: false
});

const pending = reactive({
  entry: null,
  category: null
});

const toast = reactive({
  message: "",
  type: "info",
  timer: null
});

const editingCategory = computed(() => pending.category && modals.category ? pending.category : null);

const languageOptions = computed(() =>
  supportedLanguageCodes().map((code) => ({
    code,
    label: languageConfig(code).label
  }))
);

const config = computed(() => languageConfig(state.language));
const currencySymbol = computed(() => {
  const currency = config.value.currency || "EUR";
  const parts = new Intl.NumberFormat(config.value.intlLocale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol"
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value || currency;
});

const visibleCategories = computed(() =>
  (state.activeSeries?.categories || []).filter((category) => !state.hiddenCategoryIds.has(category.id))
);

const categoryTotals = computed(() => {
  const totals = new Map();
  for (const category of state.activeSeries?.categories || []) {
    totals.set(category.id, { grams: 0, count: 0 });
  }

  for (const entry of state.activeSeries?.entries || []) {
    const total = totals.get(entry.categoryId) || { grams: 0, count: 0 };
    total.grams += Number(entry.grams || 0);
    total.count += Number(entry.count || 0);
    totals.set(entry.categoryId, total);
  }

  return totals;
});

const deleteEntrySummary = computed(() => {
  const entry = pending.entry;
  const series = state.activeSeries;
  if (!entry || !series) {
    return "";
  }

  const category = categoryById(entry.categoryId) || {
    name: entry.categoryId,
    countLabel: t("itemsLower")
  };

  return `
    <strong>${escapeHtml(category.name)} · ${formatWeightForCategory(entry.grams, category)} · ${entry.count} ${escapeHtml(
      category.countLabel || t("itemsLower")
    )}</strong>
    <span>${formatDate(entry.timestamp)}${entry.note ? ` · ${escapeHtml(entry.note)}` : ""}</span>
  `;
});

const deleteCategorySummary = computed(() => {
  const category = pending.category;
  const series = state.activeSeries;
  if (!category || !series) {
    return "";
  }

  const affectedEntries = series.entries.filter((entry) => entry.categoryId === category.id).length;
  const totals = categoryTotals.value.get(category.id) || { grams: 0, count: 0 };

  return `
    <strong>${escapeHtml(category.name)} · ${formatWeightForCategory(totals.grams, category)} · ${totals.count} ${escapeHtml(
      category.countLabel || t("itemsLower")
    )}</strong>
    <span>${t("entriesCount", { count: affectedEntries })}</span>
  `;
});

function t(key, values = {}) {
  return translate(state.language, key, values);
}

function formatWeightForCategory(grams, category = null) {
  return formatWeight(grams, category, config.value);
}

function formatDate(value) {
  return formatDateTime(value, config.value.intlLocale);
}

function formatWater(liters) {
  return `${new Intl.NumberFormat(config.value.intlLocale, {
    maximumFractionDigits: 1
  }).format(Number(liters || 0))} l`;
}

function categoryValuePerGram(category) {
  if (category?.valuePerGram !== undefined && category?.valuePerGram !== null) {
    const value = Number(category.valuePerGram);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  return null;
}

function formatMoney(value) {
  return new Intl.NumberFormat(config.value.intlLocale, {
    style: "currency",
    currency: config.value.currency || "EUR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatCategoryValue(grams, category) {
  const valuePerGram = categoryValuePerGram(category);
  if (valuePerGram === null) {
    return "";
  }
  return formatMoney(Number(grams || 0) * valuePerGram);
}

function showToast(message, type = "info") {
  clearTimeout(toast.timer);
  toast.message = message;
  toast.type = type;
  toast.timer = setTimeout(() => {
    toast.message = "";
  }, 3800);
}

function showError(error) {
  showToast(error?.message || String(error), "error");
}

function setLanguage(language) {
  state.language = normalizeLanguage(language);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
}

function categoryVisibilityStorageKey(seriesId) {
  return `${VISIBILITY_STORAGE_PREFIX}:${seriesId}`;
}

function loadCategoryVisibility(series) {
  const categoryIds = new Set((series.categories || []).map((category) => category.id));
  try {
    const saved = JSON.parse(localStorage.getItem(categoryVisibilityStorageKey(series.id)) || "[]");
    state.hiddenCategoryIds = new Set(
      Array.isArray(saved) ? saved.filter((categoryId) => categoryIds.has(categoryId)) : []
    );
  } catch {
    state.hiddenCategoryIds = new Set();
  }
}

function saveCategoryVisibility() {
  if (!state.activeSeries) {
    return;
  }

  const key = categoryVisibilityStorageKey(state.activeSeries.id);
  const hiddenIds = [...state.hiddenCategoryIds];
  if (hiddenIds.length) {
    localStorage.setItem(key, JSON.stringify(hiddenIds));
  } else {
    localStorage.removeItem(key);
  }
}

function toggleCategoryVisibility(categoryId) {
  const next = new Set(state.hiddenCategoryIds);
  if (next.has(categoryId)) {
    next.delete(categoryId);
  } else {
    next.add(categoryId);
  }
  state.hiddenCategoryIds = next;
  saveCategoryVisibility();
}

function categoryById(categoryId) {
  return state.activeSeries?.categories.find((category) => category.id === categoryId) || null;
}

async function loadSeriesList(preferredId = state.activeSeries?.id) {
  const payload = await seriesRepository.listSeries();
  state.seriesList = payload.series || [];

  if (preferredId && state.seriesList.some((series) => series.id === preferredId)) {
    await loadSeries(preferredId);
    return;
  }

  if (state.seriesList.length) {
    await loadSeries(state.seriesList[0].id);
    return;
  }

  state.activeSeries = null;
  state.hiddenCategoryIds = new Set();
}

async function loadSeries(seriesId) {
  const payload = await seriesRepository.getSeries(seriesId);
  state.activeSeries = payload.series;
  state.selectedCategoryId = state.activeSeries.categories[0]?.id || null;
  loadCategoryVisibility(state.activeSeries);
}

async function createSeries(payload) {
  try {
    const response = await seriesRepository.createSeries(payload);
    modals.newSeries = false;
    await loadSeriesList(response.series.id);
    showToast(t("seriesCreated"));
  } catch (error) {
    showError(error);
  }
}

function pickJsonFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener(
      "change",
      () => {
        resolve(input.files?.[0] || null);
      },
      { once: true }
    );
    input.click();
  });
}

async function importSeason() {
  try {
    let response;
    if (window.harvestApi) {
      response = await seriesRepository.importSeason();
    } else {
      const file = await pickJsonFile();
      if (!file) {
        return;
      }
      response = await seriesRepository.importSeason(JSON.parse(await file.text()));
    }

    if (response?.canceled) {
      return;
    }
    await loadSeriesList(response.series.id);
    showToast(t("seasonImported"));
  } catch (error) {
    showError(error);
  }
}

async function exportSeason() {
  if (!state.activeSeries) {
    showToast(t("createOrSelectSeriesFirst"), "error");
    return;
  }

  try {
    const response = await seriesRepository.exportSeason(state.activeSeries);
    if (!response?.canceled) {
      showToast(t("seasonExported"));
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      showError(error);
    }
  }
}

function openNewCategory() {
  if (!state.activeSeries) {
    showToast(t("createOrSelectSeriesFirst"), "error");
    return;
  }
  pending.category = null;
  modals.category = true;
}

function openEditCategory(category) {
  pending.category = category;
  modals.category = true;
}

function closeCategoryModal() {
  modals.category = false;
  pending.category = null;
}

async function saveCategory({ id, payload }) {
  if (!state.activeSeries) {
    return;
  }

  try {
    const response = id
      ? await seriesRepository.updateCategory(state.activeSeries.id, id, payload)
      : await seriesRepository.addCategory(state.activeSeries.id, payload);
    state.activeSeries = response.series;
    closeCategoryModal();
    await loadSeriesList(state.activeSeries.id);
    showToast(t("categorySaved"));
  } catch (error) {
    showError(error);
  }
}

function openHarvestModal() {
  if (!state.activeSeries) {
    showToast(t("createOrSelectSeriesFirst"), "error");
    return;
  }
  if (!state.activeSeries.categories.length) {
    showToast(t("addCategoryBeforeLogging"), "error");
    return;
  }
  modals.harvest = true;
}

function openWaterUsageModal() {
  if (!state.activeSeries) {
    showToast(t("createOrSelectSeriesFirst"), "error");
    return;
  }
  modals.waterUsage = true;
}

async function saveHarvest(payload) {
  if (!state.activeSeries) {
    return;
  }

  try {
    const response = await seriesRepository.addEntry(state.activeSeries.id, payload);
    state.activeSeries = response.series;
    state.selectedCategoryId = payload.categoryId;
    modals.harvest = false;
    await loadSeriesList(state.activeSeries.id);
    showToast(response.warning || t("harvestSaved"), response.warning ? "error" : "info");
  } catch (error) {
    showError(error);
  }
}

async function saveWaterUsage(payload) {
  if (!state.activeSeries) {
    return;
  }

  try {
    const response = await seriesRepository.addWaterUsage(state.activeSeries.id, payload);
    state.activeSeries = response.series;
    modals.waterUsage = false;
    await loadSeriesList(state.activeSeries.id);
    showToast(t("waterUsageSaved"));
  } catch (error) {
    showError(error);
  }
}

function openDeleteEntry(entry) {
  pending.entry = entry;
  modals.deleteEntry = true;
}

function closeDeleteEntry() {
  pending.entry = null;
  modals.deleteEntry = false;
}

async function deleteEntry() {
  if (!state.activeSeries || !pending.entry) {
    closeDeleteEntry();
    return;
  }

  try {
    const response = await seriesRepository.deleteEntry(state.activeSeries.id, pending.entry.id);
    state.activeSeries = response.series;
    closeDeleteEntry();
    await loadSeriesList(state.activeSeries.id);
    showToast(t("entryDeleted"));
  } catch (error) {
    showError(error);
  }
}

function openDeleteCategory(category) {
  pending.category = category;
  modals.deleteCategory = true;
}

function closeDeleteCategory() {
  pending.category = null;
  modals.deleteCategory = false;
}

async function deleteCategory() {
  if (!state.activeSeries || !pending.category) {
    closeDeleteCategory();
    return;
  }

  const categoryId = pending.category.id;
  try {
    const response = await seriesRepository.deleteCategory(state.activeSeries.id, categoryId);
    state.activeSeries = response.series;
    state.hiddenCategoryIds.delete(categoryId);
    saveCategoryVisibility();
    closeDeleteCategory();
    await loadSeriesList(state.activeSeries.id);
    showToast(t("categoryDeleted"));
  } catch (error) {
    showError(error);
  }
}

watch(
  config,
  (nextConfig) => {
    document.documentElement.lang = nextConfig.htmlLang;
    document.title = t("appTitle");
  },
  { immediate: true }
);

onMounted(() => {
  loadSeriesList().catch(showError);
});
</script>
