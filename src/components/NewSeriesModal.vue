<template>
  <ModalShell
    :open="open"
    :eyebrow="t('newTimeSeries')"
    :title="t('createGrowingSeason')"
    title-id="newSeriesTitle"
    :close-label="t('close')"
    @close="$emit('close')"
  >
    <form class="form-stack" @submit.prevent="submit">
      <label class="field">
        <span>{{ t("name") }}</span>
        <input v-model="name" autocomplete="off" :placeholder="t('garden2026')" required />
      </label>

      <label class="field">
        <span>{{ t("year") }}</span>
        <input v-model.number="year" type="number" min="1900" max="3000" required />
      </label>

      <div class="field">
        <span>{{ t("starterCategories") }}</span>
        <div class="starter-grid">
          <button
            v-for="category in starterCategories"
            :key="category.id"
            :class="['starter-card', { selected: selectedIds.has(category.id) }]"
            type="button"
            @click="toggleCategory(category.id)"
          >
            <CategoryIcon :icon="category.icon" :color="category.color" />
            <span>{{ t(category.labelKey || category.id) || category.name }}</span>
          </button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="secondary-button" type="button" @click="$emit('close')">{{ t("cancel") }}</button>
        <button class="primary-button" type="submit">
          <Check aria-hidden="true" />
          <span>{{ t("create") }}</span>
        </button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { Check } from "@lucide/vue";
import { ref, watch } from "vue";
import { STARTER_CATEGORIES } from "../domain/catalog";
import CategoryIcon from "./CategoryIcon.vue";
import ModalShell from "./ModalShell.vue";

const props = defineProps({
  open: Boolean,
  t: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["close", "submit"]);

const starterCategories = STARTER_CATEGORIES;
const name = ref("");
const year = ref(new Date().getFullYear());
const selectedIds = ref(new Set(STARTER_CATEGORIES.map((category) => category.id)));

function reset() {
  year.value = new Date().getFullYear();
  name.value = props.t("garden2026").replace("2026", String(year.value));
  selectedIds.value = new Set(STARTER_CATEGORIES.map((category) => category.id));
}

function toggleCategory(categoryId) {
  const next = new Set(selectedIds.value);
  if (next.has(categoryId)) {
    next.delete(categoryId);
  } else {
    next.add(categoryId);
  }
  selectedIds.value = next;
}

function submit() {
  const categories = STARTER_CATEGORIES.filter((category) => selectedIds.value.has(category.id)).map((category) => ({
    ...category,
    name: props.t(category.labelKey),
    countLabel: props.t(category.countLabelKey || "itemsLower")
  }));

  emit("submit", {
    name: name.value,
    year: Number(year.value),
    categories
  });
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      reset();
    }
  }
);
</script>
