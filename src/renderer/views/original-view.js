import { renderShell } from "./shell-view.js";

/**
 * Shim de compatibilidad — mantiene el nombre original
 * para cualquier consumidor que lo usara antes de la
 * modularizacion. Usar renderShell directamente.
 */
export function renderOriginalView() {
  return renderShell();
}
