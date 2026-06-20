export function calculateInspectorScore(checks) {
  if (!checks.length) return 0;
  const total = checks.reduce((sum, check) => {
    if (check.status === "ok") return sum + 1;
    if (check.status === "warn") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round(total / checks.length * 100);
}
