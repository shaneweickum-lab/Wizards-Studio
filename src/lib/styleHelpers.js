import { C } from "../constants/themes.js";

// ─── SHARED BUTTON STYLE HELPERS ─────────────────────────────────────────────

export const ghostBtn = (extra = {}) => ({
  padding: "12px 24px",
  background: "transparent",
  border: `1px solid ${C.border2}`,
  borderRadius: 10,
  color: C.textMid,
  fontSize: 11,
  cursor: "pointer",
  letterSpacing: 2,
  fontFamily: "monospace",
  ...extra,
});

export const primaryBtn = (extra = {}) => ({
  padding: "12px 24px",
  background: "linear-gradient(135deg,#7b6cf6,#c084fc)",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  fontSize: 11,
  cursor: "pointer",
  letterSpacing: 2,
  fontFamily: "monospace",
  ...extra,
});
