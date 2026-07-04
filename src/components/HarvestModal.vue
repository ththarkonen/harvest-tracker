<template>
  <ModalShell
    :open="open"
    :eyebrow="t('harvestEntry')"
    :title="t('addHarvest')"
    title-id="harvestTitle"
    :close-label="t('close')"
    modal-class="wide-modal"
    @close="$emit('close')"
  >
    <form class="form-stack" novalidate @submit.prevent="submit">
      <div class="field">
        <span>{{ t("category") }}</span>
        <div class="harvest-category-grid">
          <div v-if="!categories.length" class="empty-state">{{ t("addCategoryFirst") }}</div>
          <button
            v-for="category in categories"
            :key="category.id"
            :class="['harvest-category-option', { selected: category.id === selectedCategoryId }]"
            type="button"
            @click="selectedCategoryId = category.id"
          >
            <CategoryIcon :icon="category.icon" :color="category.color" />
            <span>{{ category.name }}</span>
          </button>
        </div>
      </div>

      <div class="field">
        <span>{{ t("entryMode") }}</span>
        <div class="segmented-control">
          <button type="button" :class="{ active: entryMode === 'batch' }" @click="entryMode = 'batch'">
            <Calculator aria-hidden="true" />
            <span>{{ t("batchTotal") }}</span>
          </button>
          <button type="button" :class="{ active: entryMode === 'individual' }" @click="entryMode = 'individual'">
            <ListPlus aria-hidden="true" />
            <span>{{ t("individualItems") }}</span>
          </button>
        </div>
      </div>

      <div v-if="entryMode === 'batch'" class="mode-panel">
        <label class="field">
          <span>{{ t("weight") }}</span>
          <div class="input-with-unit">
            <input
              v-model.number="batchWeight"
              type="number"
              min="0"
              :step="inputUnit === 'g' ? '0.1' : '0.001'"
              :placeholder="formatInputNumber(convertFromGrams(420, inputUnit))"
            />
            <span>{{ unitLabel(inputUnit) }}</span>
          </div>
        </label>

        <label class="field">
          <span>{{ t("quantity") }}</span>
          <input v-model.number="batchCount" type="number" min="1" step="1" placeholder="8" />
        </label>
      </div>

      <div v-else class="mode-panel">
        <div class="individual-list">
          <div v-for="(_, index) in individualWeights" :key="index" class="individual-row">
            <div class="input-with-unit">
              <input
                v-model.number="individualWeights[index]"
                type="number"
                min="0"
                step="0.001"
                :placeholder="formatInputNumber(convertFromGrams(52, inputUnit))"
              />
              <span>{{ unitLabel(inputUnit) }}</span>
            </div>
            <button class="icon-button danger" type="button" :title="t('removeItem')" @click="removeIndividualWeight(index)">
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
        <button class="secondary-button inline-button" type="button" @click="individualWeights.push(null)">
          <Plus aria-hidden="true" />
          <span>{{ t("addItem") }}</span>
        </button>
        <div class="calculated-summary">
          <span>{{ t("total") }}: {{ formatWeight(individualTotal, selectedCategory) }}</span>
          <span>{{ t("count") }}: {{ validIndividualWeights.length }}</span>
          <span>{{ t("average") }}: {{ formatWeight(individualAverage, selectedCategory) }}</span>
        </div>
      </div>

      <label class="field">
        <span>{{ t("timestamp") }}</span>
        <input v-model="timestamp" type="datetime-local" />
      </label>

      <label class="field">
        <span>{{ t("note") }}</span>
        <textarea v-model="note" rows="3" :placeholder="t('optional')"></textarea>
      </label>

      <div class="modal-actions">
        <button class="secondary-button" type="button" @click="$emit('close')">{{ t("cancel") }}</button>
        <button class="primary-button" type="submit">
          <Save aria-hidden="true" />
          <span>{{ t("saveHarvest") }}</span>
        </button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { Calculator, ListPlus, Plus, Save, X } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { localDatetimeToIso, localDatetimeValue } from "../domain/dates";
import {
  categoryWeightSettings,
  convertFromGrams,
  convertToGrams,
  formatInputNumber,
  unitLabel
} from "../domain/units";
import CategoryIcon from "./CategoryIcon.vue";
import ModalShell from "./ModalShell.vue";

const props = defineProps({
  open: Boolean,
  categories: {
    type: Array,
    required: true
  },
  selectedCategoryId: {
    type: String,
    default: null
  },
  t: {
    type: Function,
    required: true
  },
  formatWeight: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["close", "submit", "error"]);

const selectedCategoryId = ref(null);
const entryMode = ref("batch");
const batchWeight = ref(null);
const batchCount = ref(null);
const individualWeights = ref([null, null, null]);
const timestamp = ref(localDatetimeValue());
const note = ref("");

const selectedCategory = computed(
  () => props.categories.find((category) => category.id === selectedCategoryId.value) || props.categories[0] || null
);

const inputUnit = computed(() => categoryWeightSettings(selectedCategory.value).inputWeightUnit);

const validIndividualWeights = computed(() =>
  individualWeights.value.filter((value) => Number.isFinite(Number(value)) && Number(value) > 0)
);

const individualTotal = computed(() =>
  validIndividualWeights.value
    .map((value) => convertToGrams(Number(value), inputUnit.value))
    .reduce((sum, value) => sum + value, 0)
);

const individualAverage = computed(() =>
  validIndividualWeights.value.length ? individualTotal.value / validIndividualWeights.value.length : 0
);

function reset() {
  selectedCategoryId.value = props.selectedCategoryId || props.categories[0]?.id || null;
  entryMode.value = "batch";
  batchWeight.value = null;
  batchCount.value = null;
  individualWeights.value = [null, null, null];
  timestamp.value = localDatetimeValue();
  note.value = "";
}

function removeIndividualWeight(index) {
  individualWeights.value.splice(index, 1);
  if (!individualWeights.value.length) {
    individualWeights.value.push(null);
  }
}

function submit() {
  if (!selectedCategory.value) {
    emit("error", props.t("addCategoryFirst"));
    return;
  }

  if (!timestamp.value || Number.isNaN(Date.parse(timestamp.value))) {
    emit("error", props.t("enterHarvestTimestamp"));
    return;
  }

  const payload = {
    categoryId: selectedCategory.value.id,
    entryMode: entryMode.value,
    timestamp: localDatetimeToIso(timestamp.value),
    note: note.value
  };

  if (entryMode.value === "individual") {
    if (!validIndividualWeights.value.length) {
      emit("error", props.t("addAtLeastOneItemWeight"));
      return;
    }
    payload.itemWeights = validIndividualWeights.value.map((value) => convertToGrams(Number(value), inputUnit.value));
  } else {
    const grams = convertToGrams(Number(batchWeight.value), inputUnit.value);
    const count = Number(batchCount.value);
    if (!Number.isFinite(grams) || grams <= 0) {
      emit("error", props.t("enterHarvestWeight"));
      return;
    }
    if (!Number.isInteger(count) || count <= 0) {
      emit("error", props.t("enterHarvestQuantity"));
      return;
    }
    payload.grams = grams;
    payload.count = count;
  }

  emit("submit", payload);
}

watch(
  () => [props.open, props.selectedCategoryId, props.categories.length],
  () => {
    if (props.open) {
      reset();
    }
  },
  { immediate: true }
);
</script>
