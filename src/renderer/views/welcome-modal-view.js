import { esc } from "../helpers.js";
import { ui } from "../state.js";

export function renderWelcomeModal() {
  const step = ui.welcomeStep || 0;
  const slides = [
    [
      "Que es Gestor Web",
      "Es un gestor de perfiles web con identidades aisladas. Cada perfil tiene su propio fingerprint, cookies, almacenamiento y proxy. Sirve para gestionar varias cuentas online sin que se correlacionen entre si.",
    ],
    [
      "Privacidad por perfil",
      "Standard: tracker block + headers limpios + DoH. Hardened: strict referer + spoof extremo + auto-wipe. Anonymous: Tor + memoria pura.",
    ],
    [
      "Sobre los proxies",
      "Si quieres cambiar la IP por perfil, agrega proxies en la seccion Proxies (Ctrl+3). Soporta HTTP, HTTPS, SOCKS4 y SOCKS5, con o sin autenticacion.",
    ],
    [
      "Cosas que debes saber",
      "DevTools puede estar bloqueado en produccion. Atajos: Ctrl+N nuevo perfil · Ctrl+K paleta · Ctrl+0 navegador · Ctrl+1-9 vistas.",
    ],
  ];

  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-head between">
          <div class="title">Bienvenido a Gestor Web</div>
          <button class="icon-btn" data-action="close-welcome">x</button>
        </div>
        <div class="modal-body stack">
          <h2>${esc(slides[step][0])}</h2>
          <p class="muted" style="line-height:1.7">${esc(slides[step][1])}</p>
          <div class="flex">
            ${slides.map((_, i) => `<span class="dot" style="background:${i === step ? "var(--accent)" : "var(--bg-border)"}"></span>`).join("")}
          </div>
        </div>
        <div class="modal-foot between">
          <button class="btn btn-ghost" data-action="welcome-prev" ${step === 0 ? "disabled" : ""}>atras</button>
          <div class="flex">
            <button class="btn btn-ghost" data-action="close-welcome">cerrar</button>
            ${step < slides.length - 1
              ? `<button class="btn btn-primary" data-action="welcome-next">siguiente</button>`
              : `<button class="btn btn-primary" data-action="welcome-create">crear mi primer perfil</button>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}
