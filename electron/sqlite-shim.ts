// Shim for node:sqlite to redirect to better-sqlite3 or empty
// This is to prevent Electron from crashing on "node:sqlite" import
const shim = {};
export default shim;
