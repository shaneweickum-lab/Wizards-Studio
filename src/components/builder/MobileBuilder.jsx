import { C } from "../../constants/themes.js";

// ─── MOBILE NAV BAR ───────────────────────────────────────────────────────────
// Horizontal scrollable layer tab bar shown on mobile (< 768px).
// Replaces the desktop sidebar.

export default function MobileBuilder({ activeSecs, active, setActive, values, filled, quality, view, setView }) {
  return (
    <div style={{ display:"flex", background:C.surface, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
      <div style={{ display:"flex", gap:6, padding:"10px 16px", overflowX:"auto" }}>
        {activeSecs.map((sec, i) => {
          const val = values[sec.id]?.trim();
          const isActive = view==="builder" && active===i;
          return (
            <button
              key={sec.id}
              onClick={() => { setActive(i); setView("builder"); }}
              style={{
                padding:"5px 12px", borderRadius:20, flexShrink:0, display:"flex", alignItems:"center", gap:4,
                background: isActive ? `${sec.color}18` : "transparent",
                border: `1px solid ${isActive ? sec.color+"44" : "transparent"}`,
                color: isActive ? sec.color : C.textMid,
                fontSize:9, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace",
              }}>
              <span style={{ color: val ? sec.color : C.textDim, fontSize:8 }}>{val ? "●" : "○"}</span>
              {sec.label.split(" ")[1]}
            </button>
          );
        })}

        {filled > 0 && (
          <button
            onClick={() => setView(v => v==="quality" ? "builder" : "quality")}
            style={{
              padding:"5px 12px", borderRadius:20, flexShrink:0, display:"flex", alignItems:"center", gap:4,
              background: view==="quality" ? `${quality.verdictColor}18` : "transparent",
              border: `1px solid ${view==="quality" ? quality.verdictColor+"44" : "transparent"}`,
              color: view==="quality" ? quality.verdictColor : C.textMid,
              fontSize:9, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace",
            }}>
            <span style={{ fontFamily:"monospace", fontSize:8, fontWeight:"bold" }}>{quality.composite}</span>
            QUALITY
          </button>
        )}
      </div>
    </div>
  );
}
