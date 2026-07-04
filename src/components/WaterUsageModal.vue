<template>
  <ModalShell
    :open="open"
    :eyebrow="t('waterUsage')"
    :title="t('addWaterUsage')"
    title-id="waterUsageTitle"
    :close-label="t('close')"
    @close="$emit('close')"
  >
    <form class="form-stack" @submit.prevent="submit">
      <label class="field">
        <span>{{ t("waterAmount") }}</span>
        <div class="input-with-unit">
          <input v-model.number="liters" type="number" min="0" step="0.1" placeholder="10" required />
          <span>l</span>
        </div>
      </label>

      <label class="field">
        <span>{{ t("timestamp") }}</span>
        <input v-model="timestamp" type="datetime-local" required />
      </label>

      <label class="field">
        <span>{{ t("note") }}</span>
        <textarea v-model="note" rows="3" :placeholder="t('optional')"></textarea>
      </label>

      <div class="modal-actions">
        <button class="secondary-button" type="button" @click="$emit('close')">{{ t("cancel") }}</button>
        <button class="primary-button" type="submit">
          <Save aria-hidden="true" />
          <span>{{ t("saveWaterUsage") }}</span>
        </button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { Save } from "@lucide/vue";
import { ref, watch } from "vue";
import { localDatetimeToIso, localDatetimeValue } from "../domain/dates";
import ModalShell from "./ModalShell.vue";

const props = defineProps({
  open: Boolean,
  t: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(["close", "submit", "error"]);

const liters = ref(null);
const timestamp = ref(localDatetimeValue());
const note = ref("");

function reset() {
  liters.value = null;
  timestamp.value = localDatetimeValue();
  note.value = "";
}

function submit() {
  const value = Number(liters.value);
  if (!Number.isFinite(value) || value <= 0) {
    emit("error", props.t("waterAmount"));
    return;
  }

  emit("submit", {
    liters: value,
    timestamp: localDatetimeToIso(timestamp.value),
    note: note.value
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
