import { DEFAULT_UNIT_SETTINGS, WEIGHT_UNITS } from "./catalog";

export function defaultUnitSettings(system = DEFAULT_UNIT_SETTINGS.system) {
  return {
    ...DEFAULT_UNIT_SETTINGS,
    system,
    inputWeightUnit: system === "imperial" ? "oz" : "g",
    displayWeightUnit: system === "imperial" ? "oz" : "g"
  };
}

export function normalizeUnitSettings(raw = {}) {
  raw = raw || {};
  const system = raw.system === "imperial" ? "imperial" : DEFAULT_UNIT_SETTINGS.system;
  const defaults = defaultUnitSettings(system);
  const inputWeightUnit =
    WEIGHT_UNITS[raw.inputWeightUnit]?.system === system ? raw.inputWeightUnit : defaults.inputWeightUnit;
  const displayWeightUnit =
    WEIGHT_UNITS[raw.displayWeightUnit]?.system === system ? raw.displayWeightUnit : defaults.displayWeightUnit;
  const precision = Number(raw.displayPrecision);

  return {
    system,
    inputWeightUnit,
    displayWeightUnit,
    displayPrecision: Number.isInteger(precision) ? Math.max(0, Math.min(3, precision)) : defaults.displayPrecision
  };
}

export function categoryWeightSettings(category = null) {
  return normalizeUnitSettings(category?.weightSettings || DEFAULT_UNIT_SETTINGS);
}

export function unitOptions(system) {
  return Object.entries(WEIGHT_UNITS)
    .filter(([, config]) => config.system === system)
    .map(([unit]) => unit);
}

export function unitLabel(unit) {
  return WEIGHT_UNITS[unit]?.label || WEIGHT_UNITS.g.label;
}

export function unitDisplayName(unit, t) {
  const config = WEIGHT_UNITS[unit] || WEIGHT_UNITS.g;
  return t(config.nameKey);
}

export function convertFromGrams(grams, unit) {
  return Number(grams || 0) / (WEIGHT_UNITS[unit]?.grams || WEIGHT_UNITS.g.grams);
}

export function convertToGrams(value, unit) {
  return Number(value || 0) * (WEIGHT_UNITS[unit]?.grams || WEIGHT_UNITS.g.grams);
}

export function formatWeight(grams, category, languageConfig) {
  const settings = categoryWeightSettings(category);
  const unit = settings.displayWeightUnit;
  const value = convertFromGrams(grams, unit);
  const precision = Math.max(0, Math.min(3, Number(settings.displayPrecision || 0)));

  return `${new Intl.NumberFormat(languageConfig.intlLocale, {
    maximumFractionDigits: precision
  }).format(value)} ${unitLabel(unit)}`;
}

export function formatInputNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
    useGrouping: false
  }).format(Number(value || 0));
}

export function categoryWeightPlotContext(category = null) {
  const settings = categoryWeightSettings(category);
  const unit = settings.displayWeightUnit;
  const precision = Math.max(0, Math.min(3, Number(settings.displayPrecision || 0)));

  return {
    unit,
    unitLabel: unitLabel(unit),
    precision,
    hoverY: `%{y:.${precision}~f}`,
    convert: (grams) => convertFromGrams(grams, unit)
  };
}

export function weightPlotContext(categories = []) {
  const contexts = (Array.isArray(categories) ? categories : []).map(categoryWeightPlotContext);
  const firstContext = contexts[0] || categoryWeightPlotContext(null);
  const usesSharedDisplayUnit =
    contexts.length > 0 && contexts.every((candidate) => candidate.unit === firstContext.unit);
  const unit = usesSharedDisplayUnit ? firstContext.unit : DEFAULT_UNIT_SETTINGS.displayWeightUnit;
  const precision = usesSharedDisplayUnit
    ? Math.max(...contexts.map((candidate) => candidate.precision))
    : DEFAULT_UNIT_SETTINGS.displayPrecision;

  return {
    usesSharedDisplayUnit,
    unit,
    unitLabel: unitLabel(unit),
    precision,
    hoverY: `%{y:.${precision}~f}`,
    convert: (grams) => convertFromGrams(grams, unit),
    forCategory: categoryWeightPlotContext
  };
}
