<template>
  <ModalShell
    :open="open"
    :eyebrow="eyebrow"
    :title="title"
    :title-id="titleId"
    :close-label="closeLabel"
    modal-class="confirm-modal"
    @close="$emit('close')"
  >
    <p class="confirm-copy">{{ message }}</p>
    <div class="delete-entry-summary" v-html="summaryHtml"></div>

    <div class="modal-actions">
      <button class="secondary-button" type="button" @click="$emit('close')">{{ cancelLabel }}</button>
      <button class="danger-button" type="button" @click="$emit('confirm')">
        <Trash2 aria-hidden="true" />
        <span>{{ confirmLabel }}</span>
      </button>
    </div>
  </ModalShell>
</template>

<script setup>
import { Trash2 } from "@lucide/vue";
import ModalShell from "./ModalShell.vue";

defineProps({
  open: Boolean,
  eyebrow: String,
  title: String,
  titleId: String,
  closeLabel: String,
  cancelLabel: String,
  confirmLabel: String,
  message: String,
  summaryHtml: {
    type: String,
    default: ""
  }
});

defineEmits(["close", "confirm"]);
</script>
