export function formatDateTime(value, intlLocale) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function localDatetimeValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes())
  ].join("");
}

export function localDatetimeToIso(value) {
  const date = value ? new Date(value) : new Date();
  const pad = (input) => String(Math.trunc(Math.abs(input))).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offsetHours = pad(offset / 60);
  const offsetMinutes = pad(offset % 60);

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    sign,
    offsetHours,
    ":",
    offsetMinutes
  ].join("");
}
