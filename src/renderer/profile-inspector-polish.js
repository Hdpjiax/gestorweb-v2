let lastInspectorScroll = 0;
let shouldRestoreInspectorScroll = false;

function inspectorBody() {
  return document.querySelector(".inspector-body");
}

function rememberInspectorScroll() {
  const body = inspectorBody();
  if (body) lastInspectorScroll = body.scrollTop;
}

function restoreInspectorScroll() {
  if (!shouldRestoreInspectorScroll) return;
  const body = inspectorBody();
  if (!body) return;
  body.scrollTop = lastInspectorScroll;
}

function scheduleRestore() {
  shouldRestoreInspectorScroll = true;
  requestAnimationFrame(restoreInspectorScroll);
  setTimeout(restoreInspectorScroll, 0);
  setTimeout(() => {
    restoreInspectorScroll();
    shouldRestoreInspectorScroll = false;
  }, 40);
}

function shouldPreserveForAction(action) {
  return action === "toggle-profile-flag" || action === "apply-preset" || action === "refresh-fingerprint";
}

export function installProfileInspectorPolish() {
  document.addEventListener("scroll", (event) => {
    if (event.target?.classList?.contains("inspector-body")) rememberInspectorScroll();
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-action]");
    if (!target || !target.closest?.(".inspector")) return;
    if (!shouldPreserveForAction(target.dataset.action)) return;
    rememberInspectorScroll();
    scheduleRestore();
  }, true);
}
