const scheduleActions = [
  ["open", "abrir"],
  ["open_close", "abrir y cerrar"],
  ["wipe", "limpiar datos"],
  ["rotate_proxy", "rotar proxy"]
];

export function renderScheduleActionOptions() {
  return scheduleActions
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}
