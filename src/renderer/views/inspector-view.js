import { liveSet } from "../state.js";
import { buildChecks } from "../fingerprint.js";
import { calculateInspectorScore } from "./inspector-score.js";
import { renderInspectorEmpty } from "./inspector-empty-view.js";
import { renderInspectorHeader } from "./inspector-header-view.js";
import { renderInspectorTabs } from "./inspector-tabs-view.js";
import { renderInspectorLayout } from "./inspector-layout-view.js";

export function renderInspectorView(profile, renderBody, renderActions) {
  if (!profile) return renderInspectorEmpty();

  const checks = buildChecks(profile, profile.fingerprint || {}, liveSet().has(profile.id));
  const score = calculateInspectorScore(checks);

  return renderInspectorLayout({
    header: renderInspectorHeader(profile, score),
    tabs: renderInspectorTabs(),
    body: renderBody(profile),
    actions: renderActions ? renderActions(profile) : ""
  });
}
