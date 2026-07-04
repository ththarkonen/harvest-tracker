export const STARTER_CATEGORIES = [
  {
    id: "tomatoes",
    labelKey: "tomatoes",
    countLabelKey: "tomatoCountLabel",
    name: "Tomatoes",
    icon: "lucide:apple",
    color: "#d94f38",
    countLabel: "fruit"
  },
  {
    id: "peas",
    labelKey: "peas",
    countLabelKey: "peaCountLabel",
    name: "Peas",
    icon: "lucide:bean",
    color: "#4d9f55",
    countLabel: "pods"
  },
  {
    id: "strawberries",
    labelKey: "strawberries",
    countLabelKey: "strawberryCountLabel",
    name: "Strawberries",
    icon: "lucide:cherry",
    color: "#c93d5d",
    countLabel: "berries"
  }
];

export const ICON_OPTIONS = [
  { icon: "lucide:apple", labelKey: "fruiting" },
  { icon: "lucide:bean", labelKey: "pods" },
  { icon: "lucide:cherry", labelKey: "berries" },
  { icon: "lucide:carrot", labelKey: "roots" },
  { icon: "lucide:leaf", labelKey: "greens" },
  { icon: "lucide:sprout", labelKey: "seedlings" },
  { icon: "lucide:flower-2", labelKey: "flowers" },
  { icon: "lucide:wheat", labelKey: "grains" }
];

export const COLOR_OPTIONS = [
  "#d94f38",
  "#c93d5d",
  "#e19b32",
  "#4d9f55",
  "#2f7d62",
  "#387fbf",
  "#7864c8",
  "#7b5a45"
];

export const VISIBILITY_STORAGE_PREFIX = "harvest-tracker:hidden-categories";
export const LANGUAGE_STORAGE_KEY = "harvest-tracker:language";

export const DEFAULT_UNIT_SETTINGS = {
  system: "si",
  inputWeightUnit: "g",
  displayWeightUnit: "g",
  displayPrecision: 0
};

export const WEIGHT_UNITS = {
  g: { system: "si", label: "g", nameKey: "grams", grams: 1 },
  kg: { system: "si", label: "kg", nameKey: "kilograms", grams: 1000 },
  oz: { system: "imperial", label: "oz", nameKey: "ounces", grams: 28.349523125 },
  lb: { system: "imperial", label: "lb", nameKey: "pounds", grams: 453.59237 }
};

export const DEFAULT_LANGUAGE = "en";

export const DEFAULT_PLOTLY_FORMAT = {
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""],
  date: "%m/%d/%Y",
  dateTime: "%A, %B %e, %Y %X",
  time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
};

export const LANGUAGE_CONFIG = {
  en: {
    label: "🇬🇧 EN",
    htmlLang: "en",
    intlLocale: "en",
    currency: "EUR",
    plotlyLocaleName: "harvest-en"
  },
  fi: {
    label: "🇫🇮 FI",
    htmlLang: "fi",
    intlLocale: "fi-FI",
    currency: "EUR",
    plotlyLocaleName: "harvest-fi",
    plotlyFormat: {
      decimal: ",",
      thousands: " ",
      currency: ["", " EUR"],
      date: "%d.%m.%Y",
      dateTime: "%A, %d.%m.%Y klo %H.%M.%S",
      time: "%H.%M.%S",
      periods: ["ap.", "ip."],
      days: ["sunnuntai", "maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai"],
      shortDays: ["su", "ma", "ti", "ke", "to", "pe", "la"],
      months: [
        "tammikuu",
        "helmikuu",
        "maaliskuu",
        "huhtikuu",
        "toukokuu",
        "kesäkuu",
        "heinäkuu",
        "elokuu",
        "syyskuu",
        "lokakuu",
        "marraskuu",
        "joulukuu"
      ],
      shortMonths: ["tammi", "helmi", "maalis", "huhti", "touko", "kesä", "heinä", "elo", "syys", "loka", "marras", "joulu"]
    }
  },
  sv: {
    label: "🇸🇪 SV",
    htmlLang: "sv",
    intlLocale: "sv-SE",
    currency: "EUR",
    plotlyLocaleName: "harvest-sv",
    plotlyFormat: {
      decimal: ",",
      thousands: " ",
      currency: ["", " EUR"],
      date: "%Y-%m-%d",
      dateTime: "%A %e %B %Y %H:%M:%S",
      time: "%H:%M:%S",
      periods: ["fm", "em"],
      days: ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"],
      shortDays: ["sön", "mån", "tis", "ons", "tor", "fre", "lör"],
      months: [
        "januari",
        "februari",
        "mars",
        "april",
        "maj",
        "juni",
        "juli",
        "augusti",
        "september",
        "oktober",
        "november",
        "december"
      ],
      shortMonths: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
    }
  },
  de: {
    label: "🇩🇪 DE",
    htmlLang: "de",
    intlLocale: "de-DE",
    currency: "EUR",
    plotlyLocaleName: "harvest-de",
    plotlyFormat: {
      decimal: ",",
      thousands: ".",
      currency: ["", " EUR"],
      date: "%d.%m.%Y",
      dateTime: "%A, %e. %B %Y %H:%M:%S",
      time: "%H:%M:%S",
      periods: ["AM", "PM"],
      days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
      shortDays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      months: [
        "Januar",
        "Februar",
        "März",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember"
      ],
      shortMonths: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
    }
  },
  fr: {
    label: "🇫🇷 FR",
    htmlLang: "fr",
    intlLocale: "fr-FR",
    currency: "EUR",
    plotlyLocaleName: "harvest-fr",
    plotlyFormat: {
      decimal: ",",
      thousands: " ",
      currency: ["", " EUR"],
      date: "%d/%m/%Y",
      dateTime: "%A %e %B %Y %H:%M:%S",
      time: "%H:%M:%S",
      periods: ["AM", "PM"],
      days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
      shortDays: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
      months: [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre"
      ],
      shortMonths: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"]
    }
  },
  es: {
    label: "🇪🇸 ES",
    htmlLang: "es",
    intlLocale: "es-ES",
    currency: "EUR",
    plotlyLocaleName: "harvest-es",
    plotlyFormat: {
      decimal: ",",
      thousands: ".",
      currency: ["", " EUR"],
      date: "%d/%m/%Y",
      dateTime: "%A, %e de %B de %Y %H:%M:%S",
      time: "%H:%M:%S",
      periods: ["a. m.", "p. m."],
      days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
      shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
      months: [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre"
      ],
      shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]
    }
  }
};
