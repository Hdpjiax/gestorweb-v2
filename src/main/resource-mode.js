let currentMode = "economy";

function setMode(value) {
  currentMode = value === "normal" ? "normal" : "economy";
  return currentMode;
}
function getMode() { return currentMode; }
function isEconomy() { return currentMode === "economy"; }
function applyToWindow(win) {
  try { if (win && !win.isDestroyed()) win.webContents.setBackgroundThrottling(isEconomy()); } catch {}
}

module.exports = { setMode, getMode, isEconomy, applyToWindow };
