export function renderInspectorLayout({ header = "", tabs = "", body = "", actions = "" } = {}) {
  return `
    <aside class="inspector">
      ${header}
      ${tabs}
      <div class="inspector-body">${body}</div>
      ${actions ? `<div class="inspector-actions">${actions}</div>` : ""}
    </aside>
  `;
}
