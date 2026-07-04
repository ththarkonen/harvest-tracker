<template>
  <ModalShell
    :open="open"
    :eyebrow="t('category')"
    :title="category ? t('editCategory') : t('addPlantCategory')"
    title-id="categoryTitle"
    :close-label="t('close')"
    @close="$emit('close')"
  >
    <form class="form-stack" @submit.prevent="submit">
      <label class="field">
        <span>{{ t("name") }}</span>
        <input v-model="form.name" autocomplete="off" :placeholder="t('cucumbers')" required />
      </label>

      <label class="field">
        <span>{{ t("itemLabel") }}</span>
        <input v-model="form.countLabel" autocomplete="off" :placeholder="t('itemsLower')" />
      </label>

      <label class="field">
        <span>{{ t("monetaryValuePerUnit", { unit: valueUnitLabel }) }}</span>
        <div class="input-with-unit">
          <input v-model.number="form.valuePerUnit" type="number" min="0" step="0.01" placeholder="0.00" />
          <span>{{ currencyPerUnitLabel }}</span>
        </div>
      </label>

      <div class="field">
        <span>{{ t("weightUnits") }}</span>
        <div class="segmented-control">
          <button
            v-for="system in ['si', 'imperial']"
            :key="system"
            type="button"
            :class="{ active: form.weightSettings.system === system }"
            @click="setSystem(system)"
          >
            <span>{{ system === "si" ? t("siUnits") : t("imperialUnits") }}</span>
          </button>
        </div>
      </div>

      <label class="field">
        <span>{{ t("entryWeightUnit") }}</span>
        <select v-model="form.weightSettings.inputWeightUnit">
          <option v-for="unit in unitOptions(form.weightSettings.system)" :key="unit" :value="unit">
            {{ unitDisplayName(unit, t) }} ({{ unitLabel(unit) }})
          </option>
        </select>
      </label>

      <label class="field">
        <span>{{ t("displayWeightUnit") }}</span>
        <select :value="form.weightSettings.displayWeightUnit" @change="setDisplayWeightUnit($event.target.value)">
          <option v-for="unit in unitOptions(form.weightSettings.system)" :key="unit" :value="unit">
            {{ unitDisplayName(unit, t) }} ({{ unitLabel(unit) }})
          </option>
        </select>
      </label>

      <label class="field">
        <span>{{ t("decimalAccuracy") }}</span>
        <input v-model.number="form.weightSettings.displayPrecision" type="number" min="0" max="3" step="1" />
      </label>

      <div class="field">
        <span>{{ t("icon") }}</span>
        <div class="icon-grid">
          <button
            v-for="option in iconOptions"
            :key="option.icon"
            :class="['icon-option', { selected: option.icon === form.icon }]"
            type="button"
            @click="form.icon = option.icon"
          >
            <CategoryIcon :icon="option.icon" color="#2f7d62" />
            <span>{{ t(option.labelKey) }}</span>
          </button>
        </div>
      </div>

      <div class="field">
        <span>{{ t("color") }}</span>
        <div class="color-grid">
          <button
            v-for="color in colorOptions"
            :key="color"
            :class="['color-option', { selected: color === form.color }]"
            type="button"
            :title="color"
            :style="{ background: color }"
            @click="form.color = color"
          ></button>
        </div>
        <label class="custom-color-row">
          <span>{{ t("custom") }}</span>
          <input v-model="form.color" type="color" />
        </label>
      </div>

      <div class="modal-actions">
        <button class="secondary-button" type="button" @click="$emit('close')">{{ t("cancel") }}</button>
        <button class="primary-button" type="submit">
          <Check aria-hidden="true" />
          <span>{{ t("saveCategory") }}</span>
        </button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { Check } from "@lucide/vue";
import { computed, reactive, watch } from "vue";
import { COLOR_OPTIONS, ICON_OPTIONS } from "../domain/catalog";
import {
  convertToGrams,
  defaultUnitSettings,
  normalizeUnitSettings,
  unitDisplayName,
  unitLabel,
  unitOptions
} from "../domain/units";
import CategoryIcon from "./CategoryIcon.vue";
import ModalShell from "./ModalShell.vue";

const props = defineProps({
  open: Boolean,
  category: {
    type: Object,
    default: null
  },
  t: {
    type: Function,
    required: true
  },
  currencySymbol: {
    type: String,
    required: true
  }
});

const emit = defineEmits(["close", "submit"]);

const iconOptions = ICON_OPTIONS;
const colorOptions = COLOR_OPTIONS;
const form = reactive({
  name: "",
  countLabel: "",
  valuePerUnit: "",
  icon: ICON_OPTIONS[0].icon,
  color: COLOR_OPTIONS[0],
  weightSettings: defaultUnitSettings()
});

const valueUnitLabel = computed(() => unitLabel(normalizeUnitSettings(form.weightSettings).displayWeightUnit));
const currencyPerUnitLabel = computed(() => `${props.currencySymbol}/${valueUnitLabel.value}`);

function gramsPerUnit(unit) {
  return convertToGrams(1, unit);
}

function valuePerUnitToValuePerGram(value, unit) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount / gramsPerUnit(unit);
}

function valuePerGramToValuePerUnit(value, unit) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  return Math.round(amount * gramsPerUnit(unit) * 10000) / 10000;
}

function categoryValuePerGram(category) {
  if (category?.valuePerGram !== undefined && category?.valuePerGram !== null) {
    return Number(category.valuePerGram);
  }
  return null;
}

function currentValuePerGram() {
  const settings = normalizeUnitSettings(form.weightSettings);
  return valuePerUnitToValuePerGram(form.valuePerUnit, settings.displayWeightUnit);
}

function reset() {
  form.name = props.category?.name || "";
  form.countLabel = props.category?.countLabel || "";
  form.icon = props.category?.icon || ICON_OPTIONS[0].icon;
  form.color = props.category?.color || COLOR_OPTIONS[0];
  form.weightSettings = normalizeUnitSettings(props.category?.weightSettings);
  form.valuePerUnit = valuePerGramToValuePerUnit(
    categoryValuePerGram(props.category),
    form.weightSettings.displayWeightUnit
  );
}

function setSystem(system) {
  const valuePerGram = currentValuePerGram();
  const nextSettings = {
    ...defaultUnitSettings(system),
    displayPrecision: normalizeUnitSettings(form.weightSettings).displayPrecision
  };
  form.weightSettings = {
    ...nextSettings
  };
  form.valuePerUnit = valuePerGramToValuePerUnit(valuePerGram, nextSettings.displayWeightUnit);
}

function setDisplayWeightUnit(unit) {
  const settings = normalizeUnitSettings(form.weightSettings);
  const valuePerGram = currentValuePerGram();
  form.weightSettings = {
    ...settings,
    displayWeightUnit: unit
  };
  form.valuePerUnit = valuePerGramToValuePerUnit(valuePerGram, unit);
}

function submit() {
  const weightSettings = normalizeUnitSettings(form.weightSettings);
  emit("submit", {
    id: props.category?.id || null,
    payload: {
      name: form.name,
      icon: form.icon,
      color: form.color,
      countLabel: form.countLabel || props.t("itemsLower"),
      valuePerGram: valuePerUnitToValuePerGram(form.valuePerUnit, weightSettings.displayWeightUnit),
      weightSettings
    }
  });
}

watch(
  () => [props.open, props.category],
  () => {
    if (props.open) {
      reset();
    }
  },
  { immediate: true }
);
</script>
