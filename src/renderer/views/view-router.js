export function renderCurrentView(parts) {
  return parts.main || "";
}

export function renderSidePanel(parts) {
  return parts.inspector || "";
}

export function renderOverlays(parts) {
  return parts.overlays || "";
}
