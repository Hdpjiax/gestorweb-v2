// proxy-partitions.js
// WeakSet of Electron Session objects that currently have an active MITM proxy.
// Keyed by Session object identity — Session.partition does not exist in the
// Electron API, so string-based lookups always return undefined/false.
//
// Written by prepareSession() in windows.js.
// Read by app.on('certificate-error') in main.js via webContents.session.
const proxySessions = new WeakSet();
module.exports = proxySessions;
