// ─── RANKS ────────────────────────────────────────────────────────────────────
export const RANKS = [
// ── Apprentice (1–4) ────────────────────────────────────────────────────────
{ level:1,  rank:"Apprentice",     xpNeeded:0,      color:"#9ca3af", glow:"#9ca3af33" },
{ level:2,  rank:"Apprentice",     xpNeeded:50,     color:"#9ca3af", glow:"#9ca3af33" },
{ level:3,  rank:"Apprentice",     xpNeeded:130,    color:"#9ca3af", glow:"#9ca3af33" },
{ level:4,  rank:"Apprentice",     xpNeeded:250,    color:"#9ca3af", glow:"#9ca3af33" },
// ── Initiate (5–8) ──────────────────────────────────────────────────────────
{ level:5,  rank:"Initiate",       xpNeeded:420,    color:"#6ee7b7", glow:"#6ee7b733" },
{ level:6,  rank:"Initiate",       xpNeeded:650,    color:"#6ee7b7", glow:"#6ee7b733" },
{ level:7,  rank:"Initiate",       xpNeeded:950,    color:"#6ee7b7", glow:"#6ee7b733" },
{ level:8,  rank:"Initiate",       xpNeeded:1320,   color:"#6ee7b7", glow:"#6ee7b733" },
// ── Scribe (9–12) ───────────────────────────────────────────────────────────
{ level:9,  rank:"Scribe",         xpNeeded:1800,   color:"#60a5fa", glow:"#60a5fa33" },
{ level:10, rank:"Scribe",         xpNeeded:2400,   color:"#60a5fa", glow:"#60a5fa33" },
{ level:11, rank:"Scribe",         xpNeeded:3100,   color:"#60a5fa", glow:"#60a5fa33" },
{ level:12, rank:"Scribe",         xpNeeded:3900,   color:"#60a5fa", glow:"#60a5fa33" },
// ── Conjurer (13–17) ────────────────────────────────────────────────────────
{ level:13, rank:"Conjurer",       xpNeeded:4900,   color:"#a78bfa", glow:"#a78bfa33" },
{ level:14, rank:"Conjurer",       xpNeeded:6100,   color:"#a78bfa", glow:"#a78bfa33" },
{ level:15, rank:"Conjurer",       xpNeeded:7500,   color:"#a78bfa", glow:"#a78bfa33" },
{ level:16, rank:"Conjurer",       xpNeeded:9200,   color:"#a78bfa", glow:"#a78bfa33" },
{ level:17, rank:"Conjurer",       xpNeeded:11200,  color:"#a78bfa", glow:"#a78bfa33" },
// ── Mage (18–22) ────────────────────────────────────────────────────────────
{ level:18, rank:"Mage",           xpNeeded:13500,  color:"#f472b6", glow:"#f472b633" },
{ level:19, rank:"Mage",           xpNeeded:16200,  color:"#f472b6", glow:"#f472b633" },
{ level:20, rank:"Mage",           xpNeeded:19200,  color:"#f472b6", glow:"#f472b633" },
{ level:21, rank:"Mage",           xpNeeded:22700,  color:"#f472b6", glow:"#f472b633" },
{ level:22, rank:"Mage",           xpNeeded:26700,  color:"#f472b6", glow:"#f472b633" },
// ── Archmage (23–27) ────────────────────────────────────────────────────────
{ level:23, rank:"Archmage",       xpNeeded:31200,  color:"#fb923c", glow:"#fb923c33" },
{ level:24, rank:"Archmage",       xpNeeded:36400,  color:"#fb923c", glow:"#fb923c33" },
{ level:25, rank:"Archmage",       xpNeeded:42400,  color:"#fb923c", glow:"#fb923c33" },
{ level:26, rank:"Archmage",       xpNeeded:49200,  color:"#fb923c", glow:"#fb923c33" },
{ level:27, rank:"Archmage",       xpNeeded:56900,  color:"#fb923c", glow:"#fb923c33" },
// ── Grand Archmage (28–33) ──────────────────────────────────────────────────
{ level:28, rank:"Grand Archmage", xpNeeded:65700,  color:"#fbbf24", glow:"#fbbf2433" },
{ level:29, rank:"Grand Archmage", xpNeeded:75700,  color:"#fbbf24", glow:"#fbbf2433" },
{ level:30, rank:"Grand Archmage", xpNeeded:87000,  color:"#fbbf24", glow:"#fbbf2433" },
{ level:31, rank:"Grand Archmage", xpNeeded:99700,  color:"#fbbf24", glow:"#fbbf2433" },
{ level:32, rank:"Grand Archmage", xpNeeded:114000, color:"#fbbf24", glow:"#fbbf2433" },
{ level:33, rank:"Grand Archmage", xpNeeded:130000, color:"#fbbf24", glow:"#fbbf2433" },
// ── Spellbinder (34–38) ─────────────────────────────────────────────────────
{ level:34, rank:"Spellbinder",    xpNeeded:148000, color:"#f87171", glow:"#f8717133" },
{ level:35, rank:"Spellbinder",    xpNeeded:168000, color:"#f87171", glow:"#f8717133" },
{ level:36, rank:"Spellbinder",    xpNeeded:190000, color:"#f87171", glow:"#f8717133" },
{ level:37, rank:"Spellbinder",    xpNeeded:215000, color:"#f87171", glow:"#f8717133" },
{ level:38, rank:"Spellbinder",    xpNeeded:243000, color:"#f87171", glow:"#f8717133" },
// ── Enchanter (39–43) ───────────────────────────────────────────────────────
{ level:39, rank:"Enchanter",      xpNeeded:274000, color:"#e879f9", glow:"#e879f933" },
{ level:40, rank:"Enchanter",      xpNeeded:308000, color:"#e879f9", glow:"#e879f933" },
{ level:41, rank:"Enchanter",      xpNeeded:346000, color:"#e879f9", glow:"#e879f933" },
{ level:42, rank:"Enchanter",      xpNeeded:388000, color:"#e879f9", glow:"#e879f933" },
{ level:43, rank:"Enchanter",      xpNeeded:434000, color:"#e879f9", glow:"#e879f933" },
// ── Arcane Master (44–49) ───────────────────────────────────────────────────
{ level:44, rank:"Arcane Master",  xpNeeded:485000, color:"#c084fc", glow:"#c084fc33" },
{ level:45, rank:"Arcane Master",  xpNeeded:542000, color:"#c084fc", glow:"#c084fc33" },
{ level:46, rank:"Arcane Master",  xpNeeded:605000, color:"#c084fc", glow:"#c084fc33" },
{ level:47, rank:"Arcane Master",  xpNeeded:675000, color:"#c084fc", glow:"#c084fc33" },
{ level:48, rank:"Arcane Master",  xpNeeded:752000, color:"#c084fc", glow:"#c084fc33" },
{ level:49, rank:"Arcane Master",  xpNeeded:836000, color:"#c084fc", glow:"#c084fc33" },
// ── Merlin (50) — the summit ────────────────────────────────────────────────
{ level:50, rank:"Merlin",         xpNeeded:928000, color:"#fde68a", glow:"#fde68a55" },
];

export const XP_REWARDS = {
  fillSection:10, castSpell:50, saveToCodex:30,
  completeAllSections:25, createProfile:20, readLesson:15,
};

export const RANK_SYMBOLS = {
  "Apprentice":"◌", "Initiate":"◎", "Scribe":"◈", "Conjurer":"⊕",
  "Mage":"✦", "Archmage":"⬡", "Grand Archmage":"❋", "Spellbinder":"✺",
  "Enchanter":"✵", "Arcane Master":"⟡", "Merlin":"⋆｡°✩",
};
