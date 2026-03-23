// ─── GLOBAL HANDLE REGISTRY ───────────────────────────────────────────────────
// Maps handle → email. Shared across all accounts. Swap for DB lookup in production.

export function getHandleRegistry() {
  try { return JSON.parse(localStorage.getItem("sb_handles") || "{}"); }
  catch { return {}; }
}

export function saveHandleRegistry(r) {
  localStorage.setItem("sb_handles", JSON.stringify(r));
}

export function isHandleTaken(handle) {
  return !!getHandleRegistry()[handle.toLowerCase()];
}

export function reserveHandle(handle, email) {
  const r = getHandleRegistry();
  // Release any old handle this email owned
  Object.keys(r).forEach(h => { if (r[h] === email) delete r[h]; });
  r[handle.toLowerCase()] = email;
  saveHandleRegistry(r);
}

export function getEmailByHandle(handle) {
  return getHandleRegistry()[handle.toLowerCase()] || null;
}

export function validateHandle(h) {
  if (!h) return "Handle is required.";
  if (h.length < 3) return "At least 3 characters.";
  if (h.length > 20) return "Max 20 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(h)) return "Letters, numbers and underscores only.";
  return null; // valid
}
