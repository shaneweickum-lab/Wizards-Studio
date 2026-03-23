import { useEffect, useRef } from "react";
import { C } from "../../constants/themes.js";
import { DEFAULT_CODEX, CAT_COLORS } from "../../constants/codex.js";
import { SECTIONS } from "../../constants/sections.js";

// ─── CODEX PANEL ─────────────────────────────────────────────────────────────
// Slide-in panel from the right. Three tabs: My Spells / Language Models / Image Generation.
// Click a spell to load it into the builder. Delete from My Spells tab.

export default function CodexPanel({ codexCat, setCodexCat, mySpells, deleteMySpell, loadSpell, setCodexOpen, isMobile }) {
  const allCats  = ["My Spells", ...Object.keys(DEFAULT_CODEX)];
  const spells   = codexCat === "My Spells" ? mySpells : DEFAULT_CODEX[codexCat] || [];
  const catColor = codexCat === "My Spells" ? C.gold : CAT_COLORS[codexCat] || C.purple;
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setCodexOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [setCodexOpen]);

  return (
    <>
      {/* Backdrop */}
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:40, pointerEvents:"none" }} />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position:"fixed", top:0, right:0, bottom:0,
          width: isMobile ? "100vw" : 520,
          background: C.surface,
          borderLeft: `1px solid ${C.border2}`,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}>

        {/* Header */}
        <div style={{
          padding:"24px 28px 18px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0,
        }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:4, color:C.purple, fontFamily:"monospace", marginBottom:4 }}>REFERENCE LIBRARY</div>
            <div style={{ fontSize:22, color:C.text, fontStyle:"italic" }}>◈ The Codex</div>
            <div style={{ fontSize:12, color:C.textMid, marginTop:4 }}>Click any spell to load it into the builder.</div>
          </div>
          <button
            onClick={() => setCodexOpen(false)}
            style={{ background:"none", border:"none", color:C.textMid, fontSize:20, cursor:"pointer", padding:4 }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0 }}>
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setCodexCat(cat)}
              style={{
                background:"none", border:"none", padding:"12px 16px", cursor:"pointer",
                borderBottom: codexCat===cat ? `2px solid ${cat==="My Spells" ? C.gold : CAT_COLORS[cat]}` : "2px solid transparent",
                color: codexCat===cat ? (cat==="My Spells" ? C.gold : CAT_COLORS[cat]) : C.textMid,
                fontSize:9, letterSpacing:1.5, fontFamily:"monospace", whiteSpace:"nowrap", flexShrink:0,
              }}>
              {cat === "My Spells" ? `✦ MY SPELLS (${mySpells.length})` : cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Spell list */}
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {spells.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:16 }}>◈</div>
              <div style={{ fontSize:14, color:C.textMid, lineHeight:1.8 }}>
                Your Codex is empty.<br/>Cast a spell and save it here.
              </div>
            </div>
          ) : spells.map((entry, i) => (
            <div
              key={i}
              style={{
                background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12,
                padding:"18px 20px", marginBottom:12, cursor:"pointer", transition:"all 0.2s", position:"relative",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${catColor}55`; e.currentTarget.style.background = "#16162a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface2; }}>

              {codexCat === "My Spells" && (
                <button
                  onClick={e => { e.stopPropagation(); deleteMySpell(i); }}
                  style={{ position:"absolute", top:14, right:14, background:"none", border:"none", color:C.textDim, fontSize:14, cursor:"pointer", padding:2 }}>
                  ✕
                </button>
              )}

              <div onClick={() => loadSpell(entry)}>
                <div style={{ fontSize:14, color:C.text, marginBottom:4, paddingRight:24, fontStyle:"italic" }}>{entry.title}</div>
                {entry.description && (
                  <div style={{ fontSize:12, color:C.textMid, marginBottom:10 }}>{entry.description}</div>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                  {SECTIONS.filter(s => entry.spell?.[s.id]?.trim()).map(s => (
                    <div
                      key={s.id}
                      style={{
                        background:C.bg, border:`1px solid ${s.color}30`, borderRadius:10,
                        padding:"2px 10px", fontSize:8, color:s.color, letterSpacing:1, fontFamily:"monospace",
                      }}>
                      {s.label}
                    </div>
                  ))}
                </div>
                <div style={{ padding:"10px 12px", background:C.bg, borderRadius:8, borderLeft:`2px solid ${catColor}44` }}>
                  <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7, fontFamily:"monospace" }}>
                    {(entry.spell?.voice || entry.spell?.anchor || "").slice(0, 90)}…
                  </div>
                </div>
                <div style={{ marginTop:10, fontSize:8, color:catColor, letterSpacing:2, fontFamily:"monospace" }}>
                  LOAD INTO BUILDER →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
