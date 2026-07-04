<template>
  <article :class="['plot-panel', { 'plot-panel-headerless': !showHeader }]">
    <header v-if="showHeader">
      <div>
        <p class="panel-kicker">{{ kicker }}</p>
        <h3>{{ title }}</h3>
      </div>
      <component :is="icon" aria-hidden="true" />
    </header>
    <div class="plot-host">
      <div :ref="hostRef" class="plot-surface"></div>
    </div>
  </article>
</template>

<script setup>
defineProps({
  kicker: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: [Object, Function],
    required: true
  },
  hostRef: {
    type: Function,
    required: true
  },
  showHeader: {
    type: Boolean,
    default: true
  }
});
</script>
