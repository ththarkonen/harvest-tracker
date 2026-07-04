<template>
  <div v-if="open" class="modal-backdrop">
    <div :class="['modal', modalClass]" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header class="modal-header">
        <div>
          <p class="eyebrow">{{ eyebrow }}</p>
          <h2 :id="titleId">{{ title }}</h2>
        </div>
        <button class="icon-button modal-close" type="button" :title="closeLabel" @click="$emit('close')">
          <X aria-hidden="true" />
        </button>
      </header>

      <slot />
    </div>
  </div>
</template>

<script setup>
import { X } from "@lucide/vue";

defineProps({
  open: {
    type: Boolean,
    required: true
  },
  eyebrow: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  titleId: {
    type: String,
    required: true
  },
  closeLabel: {
    type: String,
    required: true
  },
  modalClass: {
    type: String,
    default: ""
  }
});

defineEmits(["close"]);
</script>
