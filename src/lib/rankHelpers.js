import { RANKS } from "../constants/ranks.js";

// ─── RANK HELPERS ─────────────────────────────────────────────────────────────

export function getRankInfo(totalXP) {
  let current = RANKS[0], next = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (totalXP >= RANKS[i].xpNeeded) { current = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  const xpIntoLevel = totalXP - current.xpNeeded;
  const xpNeededForNext = next ? next.xpNeeded - current.xpNeeded : 1;
  const pct = next ? Math.min(100, (xpIntoLevel / xpNeededForNext) * 100) : 100;
  return { current, next, pct, xpIntoLevel, xpNeededForNext };
}
