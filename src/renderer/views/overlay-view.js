import { ui } from "../state.js";
import { renderNewProfileModal } from "./new-profile-modal-view.js";
import { renderWelcomeModal } from "./welcome-modal-view.js";
import { renderCommandPalette } from "./command-palette-view.js";
import { renderCookieEditor } from "./cookie-editor-view.js";

export function renderLegacyOverlays() {
  return [
    ui.newProfile ? renderNewProfileModal() : "",
    ui.welcome ? renderWelcomeModal() : "",
    ui.command ? renderCommandPalette() : "",
    ui.cookieProfileId ? renderCookieEditor(ui.cookieProfileId) : ""
  ].join("");
}
