import { ui } from "../state.js";
import { renderNewProfileModal } from "./new-profile-modal-view.js";
import { renderWelcomeModal } from "./welcome-modal-view.js";
import { renderCommandPalette } from "./command-palette-view.js";
import { renderCookieEditor } from "./cookie-editor-view.js";

export function renderLegacyOverlays() {
  if (!ui.newProfile && !ui.welcome && !ui.command && !ui.cookieProfileId) return "";

  let html = "";
  if (ui.newProfile)      html += renderNewProfileModal();
  if (ui.welcome)         html += renderWelcomeModal();
  if (ui.command)         html += renderCommandPalette();
  if (ui.cookieProfileId) html += renderCookieEditor(ui.cookieProfileId);

  return html;
}
