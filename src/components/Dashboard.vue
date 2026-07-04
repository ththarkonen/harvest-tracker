<template>
  <main class="dashboard">
    <header class="dashboard-header">
      <div>
        <h2>{{ activeSeries?.name || t("selectOrCreateSeries") }}</h2>
      </div>
      <div class="header-actions">
        <span class="status-pill">{{ activeSeries?.year || t("noYear") }}</span>
        <span class="status-pill">{{ t("entriesCount", { count: activeSeries?.entries.length || 0 }) }}</span>
        <span class="status-pill">{{ t("totalWater") }}: {{ formatWater(totalWaterLiters) }}</span>
        <div ref="languagePicker" class="language-picker header-language-picker">
          <button
            class="language-trigger"
            type="button"
            :aria-label="t('language')"
            :aria-expanded="languageMenuOpen"
            aria-haspopup="listbox"
            @click="languageMenuOpen = !languageMenuOpen"
            @keydown.escape="languageMenuOpen = false"
          >
            <span class="language-option-text">{{ activeLanguageOption.label }}</span>
            <ChevronDown aria-hidden="true" />
          </button>
          <div v-if="languageMenuOpen" class="language-menu" role="listbox" :aria-label="t('language')">
            <button
              v-for="option in languageOptions"
              :key="option.code"
              type="button"
              :class="['language-menu-option', { selected: option.code === language }]"
              role="option"
              :aria-selected="option.code === language"
              @click="selectLanguage(option.code)"
            >
              <span class="language-option-text">{{ option.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <nav class="view-tabs" :aria-label="t('dashboardView')">
      <button
        v-for="view in viewOptions"
        :key="view.id"
        type="button"
        :class="['view-tab', { active: activeView === view.id }]"
        :aria-pressed="activeView === view.id"
        @click="activeView = view.id"
      >
        {{ t(view.labelKey) }}
      </button>
    </nav>

    <PlotGrid
      v-if="activeView !== 'harvests'"
      :view="activeView"
      :series="activeSeries"
      :visible-categories="visibleCategories"
      :language="language"
      :t="t"
    />

    <section v-if="activeView === 'harvests'" class="entries-panel">
      <header>
        <div>
          <p class="panel-kicker">{{ t("latest") }}</p>
          <h3>{{ t("recentHarvests") }}</h3>
        </div>
      </header>
      <div class="entries-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t("date") }}</th>
              <th>{{ t("category") }}</th>
              <th>{{ t("weight") }}</th>
              <th>{{ t("items") }}</th>
              <th>{{ t("mode") }}</th>
              <th>{{ t("note") }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!recentEntries.length">
              <td colspan="7">
                <div class="empty-state">{{ t("noHarvestEntries") }}</div>
              </td>
            </tr>
            <tr v-for="entry in recentEntries" :key="entry.id">
              <td>{{ formatDate(entry.timestamp) }}</td>
              <td>
                <span class="category-cell">
                  <span class="small-dot" :style="{ background: categoryFor(entry).color }"></span>
                  {{ categoryFor(entry).name }}
                </span>
              </td>
              <td>{{ formatWeight(entry.grams, categoryFor(entry)) }}</td>
              <td>{{ entry.count }} {{ categoryFor(entry).countLabel || t("itemsLower") }}</td>
              <td>{{ entry.entryMode === "individual" ? t("individual") : t("batch") }}</td>
              <td>{{ entry.note || "" }}</td>
              <td>
                <button class="icon-button danger" type="button" :title="t('deleteEntry')" @click="$emit('delete-entry', entry)">
                  <Trash2 aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ChevronDown, Trash2 } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import PlotGrid from "./PlotGrid.vue";

const props = defineProps({
  activeSeries: {
    type: Object,
    default: null
  },
  visibleCategories: {
    type: Array,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  languageOptions: {
    type: Array,
    required: true
  },
  t: {
    type: Function,
    required: true
  },
  formatWeight: {
    type: Function,
    required: true
  },
  formatWater: {
    type: Function,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["delete-entry", "language-change"]);

const viewOptions = [
  { id: "harvests", labelKey: "recentHarvests" },
  { id: "rawWeight", labelKey: "rawWeight" },
  { id: "cumulativeWeight", labelKey: "cumulativeWeight" },
  { id: "counts", labelKey: "counts" },
  { id: "cumulativeCount", labelKey: "cumulativeCount" },
  { id: "itemDistribution", labelKey: "itemDistribution" },
  { id: "waterUsage", labelKey: "dailyWaterUsage" },
  { id: "cumulativeWater", labelKey: "cumulativeWater" },
  { id: "monetaryValue", labelKey: "monetaryValue" }
];

const activeView = ref("harvests");
const languageMenuOpen = ref(false);
const languagePicker = ref(null);

const recentEntries = computed(() =>
  [...(props.activeSeries?.entries || [])]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
);

const totalWaterLiters = computed(() =>
  (props.activeSeries?.waterUsage || []).reduce((sum, entry) => sum + Number(entry.liters || 0), 0)
);

const activeLanguageOption = computed(
  () => props.languageOptions.find((option) => option.code === props.language) || props.languageOptions[0] || { label: props.language }
);

const categoriesById = computed(
  () => new Map((props.activeSeries?.categories || []).map((category) => [category.id, category]))
);

function selectLanguage(language) {
  languageMenuOpen.value = false;
  emit("language-change", language);
}

function closeLanguageMenu(event) {
  if (!languagePicker.value?.contains(event.target)) {
    languageMenuOpen.value = false;
  }
}

function categoryFor(entry) {
  return (
    categoriesById.value.get(entry.categoryId) || {
      name: entry.categoryId,
      color: "#687067",
      countLabel: props.t("itemsLower")
    }
  );
}

onMounted(() => {
  document.addEventListener("click", closeLanguageMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeLanguageMenu);
});
</script>
