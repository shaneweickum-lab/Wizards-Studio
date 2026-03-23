import { C } from "../../constants/themes.js";

// ─── APP HEADER / NAV BAR ─────────────────────────────────────────────────────
// Sticky top nav. Shows logo, quality score ring, codex button, and cast button.

export default function Header({ filled, quality, view, setView, codexOpen, setCodexOpen, allReqFilled, showFinal, handleCast }) {
  return (
    <nav style={{
      height: 52,
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18, color:C.purple }}>⚗️</span>
        <div>
          <div style={{ fontSize:16, color:C.text, fontStyle:"italic", letterSpacing:"-0.3px" }}>Wizards Studio</div>
          <div style={{ fontSize:9, color:C.textMid, letterSpacing:3, fontFamily:"monospace", marginTop:1 }}>BY WIZARDS PLAYGROUND</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {/* Quality score toggle */}
        {filled > 0 && (
          <button
            onClick={() => setView(v => v==="quality" ? "builder" : "quality")}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, cursor:"pointer",
              background: view==="quality" ? `${quality.verdictColor}15` : "transparent",
              border: `1px solid ${view==="quality" ? quality.verdictColor+"44" : C.border}`,
              transition:"all 0.2s",
            }}>
            <div style={{ width:24, height:24, position:"relative", flexShrink:0 }}>
              <svg width="24" height="24" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="12" cy="12" r="9" fill="none" stroke={C.border2} strokeWidth="3"/>
                <circle cx="12" cy="12" r="9" fill="none" stroke={quality.verdictColor} strokeWidth="3"
                  strokeDasharray={`${Math.round(quality.composite/100*56.5)} 56.5`}
                  strokeLinecap="round" style={{ transition:"stroke-dasharray 0.5s ease" }}/>
              </svg>
              <span style={{
                position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:7, fontFamily:"monospace", color:quality.verdictColor, fontWeight:"bold",
              }}>
                {quality.composite}
              </span>
            </div>
            <span style={{ fontSize:9, fontFamily:"monospace", letterSpacing:1, color:view==="quality"?quality.verdictColor:C.textMid }}>
              QUALITY
            </span>
          </button>
        )}

        {/* Codex */}
        <button
          onClick={() => setCodexOpen(true)}
          style={{
            background: codexOpen ? C.surface2 : "transparent",
            border: `1px solid ${codexOpen ? C.border2 : "transparent"}`,
            borderRadius: 8,
            padding: "6px 14px",
            color: codexOpen ? C.text : C.textMid,
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: 1.5,
            fontFamily: "monospace",
          }}>
          ◈ CODEX
        </button>

        {/* Cast shortcut */}
        {allReqFilled && view==="builder" && !showFinal && (
          <button
            onClick={handleCast}
            style={{
              background: "transparent",
              border: `1px solid ${C.purple}44`,
              borderRadius: 8,
              padding: "6px 14px",
              color: C.purple,
              fontSize: 10,
              cursor: "pointer",
              letterSpacing: 1.5,
              fontFamily: "monospace",
            }}>
            CAST ✦
          </button>
        )}
      </div>
    </nav>
  );
}
