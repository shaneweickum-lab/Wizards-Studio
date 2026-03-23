// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
// Temporary localStorage persistence — will be replaced by Supabase in production.

const LS_KEY = "ps_myspells_v1";

export function loadSpells() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

export function saveSpells(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
  catch {}
}
