import { ui, native, rerender, update } from "./state.js";

function formText(data, name) {
  return String(data.get(name) || "").trim();
}

async function handleLicenseActivation(event) {
  const form = event.target.closest?.("#licenseForm");
  if (!form) return false;
  event.preventDefault();
  event.stopImmediatePropagation();

  const text = document.getElementById("licenseText")?.value?.trim() || "";
  if (!text) return alert("Pega una licencia GW-LIC-V1 para activar esta copia.");
  if (!native?.license?.claimByKey) return alert("Activacion real solo disponible en Electron.");

  const nativeStatus = await native.license.claimByKey(text);
  if (!nativeStatus?.active) {
    return alert(`Licencia invalida para este HWID (${nativeStatus?.hwid || "desconocido"}).\n${nativeStatus?.reason || "Verifica que la licencia fue generada para este dispositivo."}`);
  }

  ui.welcome = true;
  update((state) => {
    state.license = {
      ...nativeStatus,
      active: true,
      text,
      activatedAt: Date.now()
    };
  });
  return true;
}

async function handleAdminLogin(event) {
  const form = event.target.closest?.("#adminLoginForm");
  if (!form) return false;
  event.preventDefault();
  event.stopImmediatePropagation();

  const data = new FormData(form);
  ui.adminError = "";
  try {
    const result = await native?.admin?.login?.({
      supabaseUrl: formText(data, "supabaseUrl"),
      anonKey: formText(data, "anonKey"),
      serviceRoleKey: formText(data, "serviceRoleKey"),
      privateKeyPem: String(data.get("privateKeyPem") || "").trim()
    });
    ui.adminAuthenticated = !!result?.ok;
    ui.adminServerUrl = result?.supabaseUrl || result?.serverUrl || formText(data, "supabaseUrl");
    ui.adminLicenses = result?.licenses || [];
    ui.adminGeneratedKey = "";
  } catch (error) {
    ui.adminAuthenticated = false;
    ui.adminError = error?.message || "no se pudo iniciar sesion admin";
  }
  rerender();
  return true;
}

export function initAdminLicenseActions() {
  document.addEventListener("submit", (event) => {
    handleLicenseActivation(event) || handleAdminLogin(event);
  }, true);
}
