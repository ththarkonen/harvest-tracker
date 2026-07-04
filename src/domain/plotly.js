import Plotly from "plotly.js-dist-min";
import { DEFAULT_PLOTLY_FORMAT } from "./catalog";
import { languageConfig, supportedLanguageCodes, TRANSLATIONS } from "./translations";
import { formatDateTime } from "./dates";
import { hexToRgba } from "./text";
import { weightPlotContext } from "./units";

let localesRegistered = false;

function plotlyLocale(language) {
  const config = languageConfig(language);
  const labels = TRANSLATIONS[language] || TRANSLATIONS.en;

  return {
    moduleType: "locale",
    name: config.plotlyLocaleName,
    dictionary: {
      "max:": `${labels.maximum}:`,
      "q3:": "75%:",
      "median:": `${labels.median}:`,
      "mean:": `${labels.mean}:`,
      "mean ± σ:": `${labels.mean}:`,
      "q1:": "25%:",
      "min:": `${labels.minimum}:`,
      "upper fence:": `${labels.maximum}:`,
      "lower fence:": `${labels.minimum}:`
    },
    format: {
      ...DEFAULT_PLOTLY_FORMAT,
      ...(config.plotlyFormat || {})
    }
  };
}

export function registerPlotlyLocales() {
  if (localesRegistered) {
    return;
  }

  Plotly.register(supportedLanguageCodes().map(plotlyLocale));
  localesRegistered = true;
}

export function plotConfig(language) {
  registerPlotlyLocales();

  return {
    responsive: true,
    displaylogo: false,
    locale: languageConfig(language).plotlyLocaleName,
    modeBarButtonsToRemove: ["lasso2d", "select2d"]
  };
}

export function baseLayout(yTitle) {
  return {
    autosize: true,
    margin: { t: 14, r: 14, b: 44, l: 54 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      family:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#1f2722"
    },
    xaxis: {
      showgrid: false,
      zeroline: false,
      title: ""
    },
    yaxis: {
      title: yTitle,
      gridcolor: "#e4e9df",
      zeroline: false
    },
    legend: {
      orientation: "h",
      y: -0.28,
      x: 0
    }
  };
}

function plotHoverLabel(color) {
  return {
    bgcolor: color,
    bordercolor: color,
    font: { color: "#ffffff" },
    namelength: 0
  };
}

export function itemWeightRecords(series, categoryId) {
  return (series.entries || [])
    .filter((entry) => entry.categoryId === categoryId && Array.isArray(entry.itemWeights))
    .flatMap((entry) =>
      entry.itemWeights.map((weight) => ({
        weight: Number(weight),
        timestamp: entry.timestamp
      }))
    )
    .filter((record) => Number.isFinite(record.weight));
}

export function rawWeightPlot(series, visibleCategories, t) {
  const weightContext = weightPlotContext(visibleCategories);
  const traces = visibleCategories
    .map((category) => {
      const categoryContext = weightContext.forCategory(category);
      const entries = (series.entries || [])
        .filter((entry) => entry.categoryId === category.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        x: entries.map((entry) => entry.timestamp),
        y: entries.map((entry) => categoryContext.convert(entry.grams)),
        customdata: entries.map((entry) => entry.count),
        yhoverformat: `.${categoryContext.precision}~f`,
        hovertemplate: `${categoryContext.hoverY} ${categoryContext.unitLabel}<br>%{customdata} ${t(
          "items"
        )}<br>%{x}<extra>%{fullData.name}</extra>`,
        name: category.name,
        type: "scatter",
        mode: "lines+markers",
        line: { color: category.color, width: 2 },
        marker: { color: category.color, size: 7 }
      };
    })
    .filter((trace) => trace.x.length);

  return {
    traces,
    layout: baseLayout(
      weightContext.usesSharedDisplayUnit ? `${t("gramsAxis")} (${weightContext.unitLabel})` : t("gramsAxis")
    )
  };
}

export function rawCountPlot(series, visibleCategories, t) {
  const traces = visibleCategories
    .map((category) => {
      const entries = (series.entries || [])
        .filter((entry) => entry.categoryId === category.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        x: entries.map((entry) => entry.timestamp),
        y: entries.map((entry) => Number(entry.count || 0)),
        customdata: entries.map((entry) => entry.grams),
        hovertemplate: `%{y} ${t("items")}<br>%{x}<extra>%{fullData.name}</extra>`,
        name: category.name,
        type: "scatter",
        mode: "lines+markers",
        line: { color: category.color, width: 2 },
        marker: { color: category.color, size: 7 }
      };
    })
    .filter((trace) => trace.x.length);

  return {
    traces,
    layout: baseLayout(t("counts"))
  };
}

function currencySymbolForLanguage(language) {
  const config = languageConfig(language);
  const currency = config.currency || "EUR";
  const parts = new Intl.NumberFormat(config.intlLocale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol"
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value || currency;
}

export function cumulativeValuePlot(series, visibleCategories, t, language) {
  const categoriesById = new Map(visibleCategories.map((category) => [category.id, category]));
  const entries = (series.entries || [])
    .map((entry) => {
      const category = categoriesById.get(entry.categoryId);
      const valuePerGram = Number(category?.valuePerGram);
      const grams = Number(entry.grams || 0);
      return {
        timestamp: entry.timestamp,
        value: Number.isFinite(valuePerGram) && valuePerGram >= 0 ? grams * valuePerGram : null
      };
    })
    .filter((entry) => entry.timestamp && Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const currencySymbol = currencySymbolForLanguage(language);
  let runningTotal = 0;
  const traces = entries.length
    ? [
        {
          x: entries.map((entry) => entry.timestamp),
          y: entries.map((entry) => {
            runningTotal += entry.value;
            return runningTotal;
          }),
          hovertemplate: `${t("monetaryValue")}: %{y:.2f} ${currencySymbol}<br>%{x}<extra></extra>`,
          name: t("monetaryValue"),
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#2f7d62", width: 2 },
          marker: { color: "#2f7d62", size: 7 }
        }
      ]
    : [];

  return {
    traces,
    layout: {
      ...baseLayout(`${t("monetaryValue")} (${currencySymbol})`),
      showlegend: false
    }
  };
}

function sortedWaterUsage(series) {
  return (series.waterUsage || [])
    .map((entry) => ({
      timestamp: entry.timestamp,
      liters: Number(entry.liters || 0)
    }))
    .filter((entry) => entry.timestamp && Number.isFinite(entry.liters) && entry.liters > 0)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function waterUsageDailyTotals(series) {
  const totals = new Map();
  for (const entry of sortedWaterUsage(series)) {
    const day = String(entry.timestamp).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!day) {
      continue;
    }
    totals.set(day, (totals.get(day) || 0) + entry.liters);
  }

  return [...totals.entries()]
    .map(([timestamp, liters]) => ({ timestamp, liters }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function waterUsageBarPlot(series, t) {
  const entries = waterUsageDailyTotals(series);
  const traces = entries.length
    ? [
        {
          x: entries.map((entry) => entry.timestamp),
          y: entries.map((entry) => entry.liters),
          hovertemplate: `${t("dailyWaterUsage")}: %{y:.1f} l<br>%{x}<extra></extra>`,
          name: t("dailyWaterUsage"),
          type: "bar",
          marker: {
            color: "#387fbf",
            line: { color: "#2b628f", width: 1 }
          }
        }
      ]
    : [];

  return {
    traces,
    layout: {
      ...baseLayout(`${t("dailyWaterUsage")} (l)`),
      showlegend: false
    }
  };
}

export function cumulativeWaterPlot(series, t) {
  const entries = sortedWaterUsage(series);
  let runningTotal = 0;
  const traces = entries.length
    ? [
        {
          x: entries.map((entry) => entry.timestamp),
          y: entries.map((entry) => {
            runningTotal += entry.liters;
            return runningTotal;
          }),
          hovertemplate: `${t("cumulativeWater")}: %{y:.1f} l<br>%{x}<extra></extra>`,
          name: t("cumulativeWater"),
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#387fbf", width: 2 },
          marker: { color: "#387fbf", size: 7 }
        }
      ]
    : [];

  return {
    traces,
    layout: {
      ...baseLayout(`${t("cumulativeWater")} (l)`),
      showlegend: false
    }
  };
}

export function cumulativePlot(series, visibleCategories, key, title, unitConfig) {
  const isWeight = typeof unitConfig === "object";
  const traces = visibleCategories
    .map((category) => {
      const categoryContext = isWeight ? unitConfig.forCategory(category) : null;
      const unit = categoryContext ? categoryContext.unitLabel : unitConfig;
      const convert = categoryContext ? categoryContext.convert : (value) => value;
      const hoverY = categoryContext ? categoryContext.hoverY : "%{y}";
      const entries = (series.entries || [])
        .filter((entry) => entry.categoryId === category.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      let runningTotal = 0;
      return {
        x: entries.map((entry) => entry.timestamp),
        y: entries.map((entry) => {
          runningTotal += Number(entry[key] || 0);
          return convert(runningTotal);
        }),
        yhoverformat: categoryContext ? `.${categoryContext.precision}~f` : undefined,
        hovertemplate: `${hoverY} ${unit}<br>%{x}<extra>%{fullData.name}</extra>`,
        name: category.name,
        type: "scatter",
        mode: "lines+markers",
        line: { color: category.color, width: 2 },
        marker: { color: category.color, size: 6 }
      };
    })
    .filter((trace) => trace.x.length);

  return {
    traces,
    layout: baseLayout(
      isWeight && unitConfig.usesSharedDisplayUnit ? `${title} (${unitConfig.unitLabel})` : title
    )
  };
}

export function itemDistributionPlot(series, visibleCategories, t, intlLocale) {
  const weightContext = weightPlotContext(visibleCategories);
  const traces = visibleCategories.flatMap((category, categoryIndex) => {
    const categoryContext = weightContext.forCategory(category);
    const records = itemWeightRecords(series, category.id);
    const weights = records.map((record) => categoryContext.convert(record.weight));
    if (!weights.length) {
      return [];
    }

    const xCenter = categoryIndex + 1;
    const x = weights.map(() => xCenter);
    const pointTimestamps = records.map((record) => formatDateTime(record.timestamp, intlLocale));

    return [
      {
        x,
        y: weights,
        name: "",
        legendgroup: category.id,
        showlegend: false,
        type: "violin",
        points: false,
        width: 0.8,
        spanmode: "hard",
        fillcolor: hexToRgba(category.color, 0.18),
        line: { color: hexToRgba(category.color, 0.78), width: 1.5 },
        meanline: { visible: true, color: hexToRgba(category.color, 0), width: 0 },
        hoveron: "violins",
        hoverinfo: "y+text",
        text: "",
        hoverlabel: plotHoverLabel(category.color),
        yhoverformat: `.${categoryContext.precision}~f`,
        hovertemplate: `${t("weight")}: ${categoryContext.hoverY} ${categoryContext.unitLabel}<extra></extra>`
      },
      {
        x0: xCenter,
        y: weights,
        name: "",
        legendgroup: category.id,
        showlegend: false,
        type: "box",
        boxpoints: false,
        boxmean: true,
        hoverinfo: "y+text",
        text: "",
        hoverlabel: plotHoverLabel(category.color),
        yhoverformat: `.${categoryContext.precision}~f`,
        width: 0.28,
        fillcolor: hexToRgba(category.color, 0.22),
        marker: { color: category.color },
        line: { color: category.color, width: 2 }
      },
      {
        x,
        y: weights,
        customdata: pointTimestamps,
        name: "",
        legendgroup: category.id,
        showlegend: false,
        type: "scatter",
        mode: "markers",
        marker: {
          color: category.color,
          line: { color: "#ffffff", width: 1 },
          opacity: 0.86,
          size: 6
        },
        yhoverformat: `.${categoryContext.precision}~f`,
        hovertemplate: `${t("weight")}: ${categoryContext.hoverY} ${categoryContext.unitLabel}<br>%{customdata}<extra></extra>`
      }
    ];
  });

  const yAxisTitle = weightContext.usesSharedDisplayUnit
    ? `${t("itemGramsAxis")} (${weightContext.unitLabel})`
    : t("itemGramsAxis");
  const layout = {
    ...baseLayout(yAxisTitle),
    boxmode: "overlay",
    hovermode: "closest",
    hoverlabel: {
      font: { color: "#ffffff" }
    },
    violinmode: "overlay",
    xaxis: {
      showgrid: false,
      zeroline: false,
      title: "",
      tickmode: "array",
      tickvals: visibleCategories.map((_, index) => index + 1),
      ticktext: visibleCategories.map((category) => category.name),
      range: [0.4, visibleCategories.length + 0.6]
    },
    yaxis: {
      ...baseLayout(yAxisTitle).yaxis,
      ticksuffix: weightContext.usesSharedDisplayUnit ? ` ${weightContext.unitLabel}` : "",
      showticksuffix: "all"
    }
  };

  return { traces, layout };
}

export { Plotly };
