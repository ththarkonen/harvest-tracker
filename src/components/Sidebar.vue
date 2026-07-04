<template>
  <aside class="sidebar">
    <section class="control-section">
      <div class="section-title-row">
        <h2>{{ t("timeSeries") }}</h2>
        <div class="section-title-actions">
          <div class="season-menu-wrapper" ref="seasonActions">
            <button
              class="icon-button"
              type="button"
              :title="t('seasonActions')"
              :aria-expanded="seasonActionsOpen"
              @click="toggleSeasonActions"
            >
              <EllipsisVertical aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div class="series-picker" ref="seriesPicker">
        <button class="series-trigger" type="button" @click="seriesMenuOpen = !seriesMenuOpen">
          <span>
            <strong>{{ activeSeries?.name || t("noSeriesSelected") }}</strong>
            <small>{{ activeSeriesMeta }}</small>
          </span>
          <ChevronsUpDown aria-hidden="true" />
        </button>
        <div v-if="seriesMenuOpen" class="series-menu">
          <div v-if="!seriesList.length" class="empty-state">{{ t("noSavedSeries") }}</div>
          <button
            v-for="series in seriesList"
            :key="series.id"
            :class="['series-option', { active: series.id === activeSeries?.id }]"
            type="button"
            @click="selectSeries(series.id)"
          >
            <span>
              <strong>{{ series.name }}</strong>
              <small>{{ series.year }} · {{ t("entriesCount", { count: series.entryCount }) }}</small>
            </span>
            <small>{{ formatSeriesTotal(series.totalGrams) }}</small>
          </button>
        </div>
      </div>

      <button class="primary-button full-width" type="button" @click="$emit('new-series')">
        <Plus aria-hidden="true" />
        <span>{{ t("newSeries") }}</span>
      </button>
    </section>

    <section class="control-section harvest-actions">
      <button class="primary-button full-width" type="button" @click="$emit('add-water-usage')">
        <Droplets aria-hidden="true" />
        <span>{{ t("addWaterUsage") }}</span>
      </button>
      <button class="primary-button full-width" type="button" @click="$emit('add-harvest')">
        <Scale aria-hidden="true" />
        <span>{{ t("addHarvest") }}</span>
      </button>
    </section>

    <section class="control-section">
      <div class="section-title-row">
        <h2>{{ t("categories") }}</h2>
        <button class="icon-button" type="button" :title="t('addCategory')" @click="$emit('add-category')">
          <Plus aria-hidden="true" />
        </button>
      </div>

      <div class="category-list">
        <div v-if="!activeSeries" class="empty-state">{{ t("noActiveSeries") }}</div>
        <div v-else-if="!activeSeries.categories.length" class="empty-state">{{ t("noCategories") }}</div>
        <div
          v-for="category in activeSeries?.categories || []"
          :key="category.id"
          :class="['category-chip', { 'is-hidden': hiddenCategoryIds.has(category.id) }]"
          tabindex="0"
          :aria-label="categoryAriaLabel(category)"
          @pointerover="showTooltip($event, category)"
          @pointerout="hideTooltip"
          @focusin="showTooltip($event, category)"
          @focusout="hideTooltip"
        >
          <CategoryIcon :icon="category.icon" :color="category.color" />
          <span class="category-chip-text">
            <strong>{{ category.name }}</strong>
            <small>{{ categoryTotalText(category) }}</small>
          </span>
          <div class="category-chip-actions category-action-menu-wrapper">
            <button
              class="icon-button"
              type="button"
              :title="t('categoryActions')"
              :aria-expanded="openCategoryMenuId === category.id"
              @click="toggleCategoryMenu(category.id, $event)"
            >
              <EllipsisVertical aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="tooltip.visible"
      ref="tooltipRef"
      class="category-tooltip"
      :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }"
      role="tooltip"
    >
      {{ tooltip.text }}
    </div>

    <Teleport to="body">
      <div
        v-if="seasonActionsOpen"
        class="season-actions-menu floating-action-menu"
        :style="{ left: `${seasonMenu.left}px`, top: `${seasonMenu.top}px` }"
        role="menu"
      >
        <button type="button" role="menuitem" @click="importSeason">
          <Upload aria-hidden="true" />
          <span>{{ t("importSeason") }}</span>
        </button>
        <button type="button" role="menuitem" :disabled="!activeSeries" @click="exportSeason">
          <Download aria-hidden="true" />
          <span>{{ t("exportCurrentSeason") }}</span>
        </button>
      </div>

      <div
        v-if="activeCategoryMenu"
        class="category-actions-menu floating-action-menu"
        :style="{ left: `${categoryMenu.left}px`, top: `${categoryMenu.top}px` }"
        role="menu"
      >
        <button type="button" role="menuitem" @click="editCategory(activeCategoryMenu)">
          <Pencil aria-hidden="true" />
          <span>{{ t("editCategory") }}</span>
        </button>
        <button type="button" role="menuitem" @click="toggleCategoryVisibility(activeCategoryMenu)">
          <EyeOff v-if="hiddenCategoryIds.has(activeCategoryMenu.id)" aria-hidden="true" />
          <Eye v-else aria-hidden="true" />
          <span>{{ hiddenCategoryIds.has(activeCategoryMenu.id) ? t("showInPlots") : t("hideFromPlots") }}</span>
        </button>
        <button class="danger" type="button" role="menuitem" @click="deleteCategory(activeCategoryMenu)">
          <Trash2 aria-hidden="true" />
          <span>{{ t("deleteCategory") }}</span>
        </button>
      </div>
    </Teleport>
  </aside>
</template>

<script setup>
import {
  ChevronsUpDown,
  Download,
  Droplets,
  EllipsisVertical,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Upload
} from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { isTruncated } from "../domain/text";
import CategoryIcon from "./CategoryIcon.vue";

const props = defineProps({
  t: {
    type: Function,
    required: true
  },
  seriesList: {
    type: Array,
    required: true
  },
  activeSeries: {
    type: Object,
    default: null
  },
  hiddenCategoryIds: {
    type: Set,
    required: true
  },
  categoryTotals: {
    type: Object,
    required: true
  },
  formatWeight: {
    type: Function,
    required: true
  },
  formatCategoryValue: {
    type: Function,
    required: true
  }
});

const emit = defineEmits([
  "add-category",
  "add-harvest",
  "add-water-usage",
  "delete-category",
  "edit-category",
  "export-season",
  "import-season",
  "new-series",
  "select-series",
  "toggle-category"
]);

const seriesMenuOpen = ref(false);
const seasonActionsOpen = ref(false);
const openCategoryMenuId = ref(null);
const seriesPicker = ref(null);
const seasonActions = ref(null);
const tooltipRef = ref(null);
const seasonMenu = reactive({
  left: 0,
  top: 0
});
const categoryMenu = reactive({
  left: 0,
  top: 0
});
const tooltip = reactive({
  visible: false,
  text: "",
  left: 0,
  top: 0
});

const activeSeriesMeta = computed(() => {
  if (!props.activeSeries) {
    return props.t("createSeasonToBegin");
  }

  return `${props.activeSeries.year} · ${props.t("entriesCount", {
    count: props.activeSeries.entries.length
  })}`;
});

const activeCategoryMenu = computed(
  () => (props.activeSeries?.categories || []).find((category) => category.id === openCategoryMenuId.value) || null
);

function menuPositionForTrigger(trigger, width = 210) {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 10;
  let left = rect.right + gap;
  if (left + width + viewportPadding > window.innerWidth) {
    left = rect.left - width - gap;
  }

  return {
    left: Math.max(viewportPadding, left),
    top: Math.max(viewportPadding, Math.min(rect.top, window.innerHeight - viewportPadding - 120))
  };
}

function setMenuPosition(target, event, width) {
  const trigger = event.currentTarget;
  const position = menuPositionForTrigger(trigger, width);
  target.left = position.left;
  target.top = position.top;
}

function closeFloatingMenus() {
  seasonActionsOpen.value = false;
  openCategoryMenuId.value = null;
}

function selectSeries(seriesId) {
  seriesMenuOpen.value = false;
  emit("select-series", seriesId);
}

function toggleSeasonActions(event) {
  hideTooltip();
  openCategoryMenuId.value = null;
  if (!seasonActionsOpen.value) {
    setMenuPosition(seasonMenu, event, 210);
  }
  seasonActionsOpen.value = !seasonActionsOpen.value;
}

function importSeason() {
  seasonActionsOpen.value = false;
  emit("import-season");
}

function exportSeason() {
  if (!props.activeSeries) {
    return;
  }
  seasonActionsOpen.value = false;
  emit("export-season");
}

function toggleCategoryMenu(categoryId, event) {
  hideTooltip();
  seasonActionsOpen.value = false;
  if (openCategoryMenuId.value !== categoryId) {
    setMenuPosition(categoryMenu, event, 184);
    openCategoryMenuId.value = categoryId;
    return;
  }
  openCategoryMenuId.value = null;
}

function editCategory(category) {
  openCategoryMenuId.value = null;
  emit("edit-category", category);
}

function toggleCategoryVisibility(category) {
  openCategoryMenuId.value = null;
  emit("toggle-category", category.id);
}

function deleteCategory(category) {
  openCategoryMenuId.value = null;
  emit("delete-category", category);
}

function formatSeriesTotal(grams) {
  return props.formatWeight(grams, null);
}

function categoryTotal(category) {
  return props.categoryTotals.get(category.id) || { grams: 0, count: 0 };
}

function categoryTotalText(category) {
  const total = categoryTotal(category);
  const parts = [
    props.formatWeight(total.grams, category),
    `${total.count} ${category.countLabel || props.t("itemsLower")}`
  ];
  const value = props.formatCategoryValue(total.grams, category);
  if (value) {
    parts.push(props.t("totalValue", { value }));
  }
  return parts.join(" · ");
}

function categoryAriaLabel(category) {
  return `${category.name}, ${categoryTotalText(category)}`;
}

function chipNeedsTooltip(chip) {
  return (
    isTruncated(chip.querySelector(".category-chip-text strong")) ||
    isTruncated(chip.querySelector(".category-chip-text small"))
  );
}

function showTooltip(event, category) {
  if (event.target.closest(".category-chip-actions")) {
    hideTooltip();
    return;
  }

  const chip = event.currentTarget;
  if (!chipNeedsTooltip(chip)) {
    hideTooltip();
    return;
  }

  tooltip.text = `${category.name}\n${categoryTotalText(category)}`;
  tooltip.visible = true;

  requestAnimationFrame(() => {
    const chipRect = chip.getBoundingClientRect();
    const tooltipRect = tooltipRef.value?.getBoundingClientRect() || { width: 0, height: 0 };
    const gap = 12;
    const viewportPadding = 12;
    let left = chipRect.right + gap;
    if (left + tooltipRect.width + viewportPadding > window.innerWidth) {
      left = chipRect.left - tooltipRect.width - gap;
    }

    tooltip.left = Math.max(viewportPadding, left);
    tooltip.top = Math.max(
      viewportPadding,
      Math.min(
        chipRect.top + chipRect.height / 2 - tooltipRect.height / 2,
        window.innerHeight - tooltipRect.height - viewportPadding
      )
    );
  });
}

function hideTooltip() {
  tooltip.visible = false;
}

function closeSeriesMenu(event) {
  if (!seriesPicker.value?.contains(event.target)) {
    seriesMenuOpen.value = false;
  }
  if (!seasonActions.value?.contains(event.target) && !event.target.closest(".season-actions-menu")) {
    seasonActionsOpen.value = false;
  }
  if (!event.target.closest(".category-action-menu-wrapper") && !event.target.closest(".category-actions-menu")) {
    openCategoryMenuId.value = null;
  }
}

onMounted(() => {
  document.addEventListener("click", closeSeriesMenu);
  window.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("scroll", closeFloatingMenus, true);
  window.addEventListener("resize", hideTooltip);
  window.addEventListener("resize", closeFloatingMenus);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeSeriesMenu);
  window.removeEventListener("scroll", hideTooltip, true);
  window.removeEventListener("scroll", closeFloatingMenus, true);
  window.removeEventListener("resize", hideTooltip);
  window.removeEventListener("resize", closeFloatingMenus);
});
</script>
