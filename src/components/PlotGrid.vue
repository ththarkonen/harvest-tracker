<template>
  <section class="plot-view">
    <PlotPanel
      :kicker="activePlot.kicker"
      :title="activePlot.title"
      :icon="activePlot.icon"
      :host-ref="setHost"
      :show-header="false"
    />
  </section>
</template>

<script setup>
import { Activity, BarChart3, Box, Droplets, Hash, LineChart } from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { languageConfig } from "../domain/translations";
import {
  Plotly,
  cumulativePlot,
  cumulativeValuePlot,
  cumulativeWaterPlot,
  itemDistributionPlot,
  plotConfig,
  rawCountPlot,
  rawWeightPlot,
  waterUsageBarPlot
} from "../domain/plotly";
import { weightPlotContext } from "../domain/units";
import PlotPanel from "./PlotPanel.vue";

const props = defineProps({
  view: {
    type: String,
    required: true
  },
  series: {
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
  t: {
    type: Function,
    required: true
  }
});

const host = ref(null);

function hasHarvestEntries(series) {
  return Boolean(series?.entries?.length);
}

function hasWaterEntries(series) {
  return Boolean(series?.waterUsage?.length);
}

const plotDefinitions = computed(() => ({
  rawWeight: {
    kicker: props.t("entries"),
    title: props.t("rawWeight"),
    icon: Activity,
    empty: props.t("noRawWeights"),
    hasData: hasHarvestEntries,
    usesCategories: true,
    build: () => rawWeightPlot(props.series, props.visibleCategories, props.t)
  },
  cumulativeWeight: {
    kicker: props.t("runningTotal"),
    title: props.t("cumulativeWeight"),
    icon: LineChart,
    empty: props.t("noCumulativeWeights"),
    hasData: hasHarvestEntries,
    usesCategories: true,
    build: () =>
      cumulativePlot(
        props.series,
        props.visibleCategories,
        "grams",
        props.t("cumulativeGrams"),
        weightPlotContext(props.visibleCategories)
      )
  },
  monetaryValue: {
    kicker: props.t("runningTotal"),
    title: props.t("monetaryValue"),
    icon: LineChart,
    empty: props.t("noMonetaryValue"),
    hasData: hasHarvestEntries,
    usesCategories: true,
    build: () => cumulativeValuePlot(props.series, props.visibleCategories, props.t, props.language)
  },
  counts: {
    kicker: props.t("quantity"),
    title: props.t("counts"),
    icon: Hash,
    empty: props.t("noRawCounts"),
    hasData: hasHarvestEntries,
    usesCategories: true,
    build: () => rawCountPlot(props.series, props.visibleCategories, props.t)
  },
  cumulativeCount: {
    kicker: props.t("runningTotal"),
    title: props.t("cumulativeCount"),
    icon: BarChart3,
    empty: props.t("noCumulativeCounts"),
    hasData: hasHarvestEntries,
    usesCategories: true,
    build: () =>
      cumulativePlot(props.series, props.visibleCategories, "count", props.t("cumulativeCount"), props.t("items"))
  },
  itemDistribution: {
    kicker: props.t("individualMode"),
    title: props.t("itemDistribution"),
    icon: Box,
    empty: props.t("noIndividualWeights"),
    hasData: hasHarvestEntries,
    usesCategories: true,
    build: () =>
      itemDistributionPlot(props.series, props.visibleCategories, props.t, languageConfig(props.language).intlLocale)
  },
  waterUsage: {
    kicker: props.t("waterUsage"),
    title: props.t("dailyWaterUsage"),
    icon: Droplets,
    empty: props.t("noWaterUsage"),
    hasData: hasWaterEntries,
    usesCategories: false,
    build: () => waterUsageBarPlot(props.series, props.t)
  },
  cumulativeWater: {
    kicker: props.t("runningTotal"),
    title: props.t("cumulativeWater"),
    icon: LineChart,
    empty: props.t("noWaterUsage"),
    hasData: hasWaterEntries,
    usesCategories: false,
    build: () => cumulativeWaterPlot(props.series, props.t)
  }
}));

const activePlot = computed(() => plotDefinitions.value[props.view] || plotDefinitions.value.rawWeight);

function setHost(element) {
  host.value = element;
}

function showEmpty(message) {
  if (!host.value) {
    return;
  }
  Plotly.purge(host.value);
  host.value.innerHTML = `<div class="empty-state">${message}</div>`;
}

async function renderPlot() {
  await nextTick();
  if (!host.value) {
    return;
  }

  const series = props.series;
  if (!series || !activePlot.value.hasData(series)) {
    showEmpty(activePlot.value.empty);
    return;
  }

  if (activePlot.value.usesCategories && !props.visibleCategories.length) {
    showEmpty(props.t("noVisibleCategories"));
    return;
  }

  const plot = activePlot.value.build();
  if (!plot.traces.length) {
    showEmpty(activePlot.value.empty);
    return;
  }

  if (host.value.querySelector(".empty-state")) {
    host.value.innerHTML = "";
  }
  Plotly.react(host.value, plot.traces, plot.layout, plotConfig(props.language));
}

function resizePlot() {
  if (host.value) {
    Plotly.Plots.resize(host.value);
  }
}

watch(
  () => [props.view, props.series, props.visibleCategories.map((category) => category.id).join(","), props.language],
  renderPlot,
  { deep: true }
);

onMounted(() => {
  renderPlot();
  window.addEventListener("resize", resizePlot);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizePlot);
  if (host.value) {
    Plotly.purge(host.value);
  }
});
</script>
