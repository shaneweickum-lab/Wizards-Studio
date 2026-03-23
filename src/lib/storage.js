// ─── PER-ACCOUNT STORAGE ──────────────────────────────────────────────────────
// Keys namespaced per email — ready to swap for Supabase in production.

export function accountKey(email, key) {
  return `sb_${btoa(email)}_${key}`;
}

export function loadAccountState(email) {
  try {
    return {
      profile:     JSON.parse(localStorage.getItem(accountKey(email, "profile")) || "null"),
      xp:          parseInt(localStorage.getItem(accountKey(email, "xp")) || "0"),
      mySpells:    JSON.parse(localStorage.getItem(accountKey(email, "myspells")) || "[]"),
      isPro:       JSON.parse(localStorage.getItem(accountKey(email, "pro")) || "false"),
      lessonsRead: JSON.parse(localStorage.getItem(accountKey(email, "lessons_read")) || "[]"),
    };
  } catch { return { profile:null, xp:0, mySpells:[], isPro:false, lessonsRead:[] }; }
}

export function saveAccountField(email, key, value) {
  localStorage.setItem(
    accountKey(email, key),
    typeof value === "string" ? value : JSON.stringify(value)
  );
}

export function getAccounts() {
  try { return JSON.parse(localStorage.getItem("sb_accounts") || "{}"); }
  catch { return {}; }
}

export function saveAccounts(a) {
  localStorage.setItem("sb_accounts", JSON.stringify(a));
}

export function getActiveEmail() {
  return localStorage.getItem("sb_active_email") || null;
}

export function setActiveEmail(e) {
  if (e) localStorage.setItem("sb_active_email", e);
  else localStorage.removeItem("sb_active_email");
}
