<template>
  <span class="category-icon" :style="{ background: color }">
    <component :is="iconComponent" aria-hidden="true" />
  </span>
</template>

<script setup>
import {
  Apple,
  Bean,
  Carrot,
  Cherry,
  Flower2,
  Leaf,
  Sprout,
  Wheat
} from "@lucide/vue";
import { computed } from "vue";

const props = defineProps({
  icon: {
    type: String,
    default: "lucide:leaf"
  },
  color: {
    type: String,
    default: "#3f7f5f"
  }
});

const icons = {
  "lucide:apple": Apple,
  "lucide:bean": Bean,
  "lucide:carrot": Carrot,
  "lucide:cherry": Cherry,
  "lucide:flower-2": Flower2,
  "lucide:leaf": Leaf,
  "lucide:sprout": Sprout,
  "lucide:wheat": Wheat
};

const iconComponent = computed(() => icons[props.icon] || Leaf);
</script>
