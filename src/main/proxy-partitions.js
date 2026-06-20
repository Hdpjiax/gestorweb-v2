// proxy-partitions.js
// Shared singleton Set — tracks which Electron session partitions currently
// have an active MITM proxy. Read by the app-level certificate-error handler
// in main.js; written by prepareSession in windows.js.
// Using a plain module-level Set avoids any circular-dependency issues between
// main.js, ipc.js and windows.js.
const _proxyPartitions = new Set();
module.exports = _proxyPartitions;
