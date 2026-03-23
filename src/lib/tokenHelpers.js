// ─── RESET TOKEN HELPERS ──────────────────────────────────────────────────────

export function generateToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function saveResetToken(email, token) {
  localStorage.setItem(
    `sb_reset_${email}`,
    JSON.stringify({ token, expires: Date.now() + 30 * 60 * 1000 })
  );
}

export function getResetToken(email) {
  try {
    const d = JSON.parse(localStorage.getItem(`sb_reset_${email}`) || "null");
    if (!d) return null;
    if (Date.now() > d.expires) {
      localStorage.removeItem(`sb_reset_${email}`);
      return null;
    }
    return d.token;
  } catch { return null; }
}

export function clearResetToken(email) {
  localStorage.removeItem(`sb_reset_${email}`);
}
