import { C } from "../../constants/themes.js";

// ─── BUILDER SIDEBAR ──────────────────────────────────────────────────────────
// Desktop-only left panel. Shows layer progress, quality score ring, layer list,
// and a clear button. Defined at module scope to prevent focus-stealing remounts.

export default function BuilderSidebar({ activeSecs, active, setActive, values, filled, progress, quality, view, setView, resetSpell }) {
  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      background: C.surface,
    }}>
      {/* Progress header */}
      <div style={{ padding:"20px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:9, color:C.textDim, letterSpacing:3, fontFamily:"monospace", marginBottom:8 }}>FIVE LAYERS</div>
        <div style={{ height:2, background:C.border, borderRadius:1, overflow:"hidden" }}>
          <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${C.purple}88,${C.purple})`, transition:"width 0.4s" }} />
        </div>
        <div style={{ fontSize:9, color:C.textMid, fontFamily:"monospace", marginTop:6 }}>{filled}/{activeSecs.length} filled</div>
      </div>

      {/* Quality score toggle */}
      {filled > 0 && (
        <button
          onClick={() => setView(v => v==="quality" ? "builder" : "quality")}
          style={{
            margin:"10px 12px 0", padding:"10px 14px", boxSizing:"border-box", width:"calc(100% - 24px)",
            background: view==="quality" ? `${quality.verdictColor}12` : C.surface2,
            border: `1px solid ${view==="quality" ? quality.verdictColor+"44" : C.border}`,
            borderRadius: 10, cursor:"pointer", display:"flex", alignItems:"center", gap:10, transition:"all 0.2s",
          }}>
          <div style={{ flex:1, textAlign:"left" }}>
            <div style={{ fontSize:8, letterSpacing:2, color:C.textMid, fontFamily:"monospace", marginBottom:3 }}>QUALITY SCORE</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:20, fontWeight:"bold", color:quality.verdictColor, fontFamily:"monospace" }}>{quality.composite}</span>
              <span style={{ fontSize:9, color:quality.verdictColor }}>{quality.verdictIcon} {quality.verdict.split(" — ")[0]}</span>
            </div>
          </div>
          <svg width="32" height="32" style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
            <circle cx="16" cy="16" r="12" fill="none" stroke={C.border2} strokeWidth="3"/>
            <circle cx="16" cy="16" r="12" fill="none" stroke={quality.verdictColor} strokeWidth="3"
              strokeDasharray={`${Math.round(quality.composite/100*75.4)} 75.4`}
              strokeLinecap="round" style={{ transition:"stroke-dasharray 0.5s ease" }}/>
          </svg>
        </button>
      )}

      {/* Layer list */}
      {activeSecs.map((sec, i) => {
        const val = values[sec.id]?.trim();
        const isActive = active === i;
        return (
          <div
            key={sec.id}
            onClick={() => setActive(i)}
            style={{
              padding:"14px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
              borderLeft:`2px solid ${isActive ? sec.color : "transparent"}`,
              background: isActive ? `${sec.color}08` : "transparent",
              transition:"all 0.15s",
            }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14, color: val ? sec.color : C.textDim }}>{val ? "●" : "○"}</span>
              <div>
                <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, fontFamily:"monospace" }}>{sec.number}</div>
                <div style={{ fontSize:12, color: isActive ? sec.color : (val ? C.text : C.textMid) }}>{sec.label}</div>
              </div>
              {sec.optional && (
                <span style={{ fontSize:8, color:C.textDim, fontFamily:"monospace", marginLeft:"auto" }}>opt</span>
              )}
            </div>
            {val && (
              <div style={{
                fontSize:10, color:C.textMid, marginTop:6, lineHeight:1.5,
                overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
              }}>
                {val.slice(0, 60)}…
              </div>
            )}
          </div>
        );
      })}

      {/* Clear button */}
      <div style={{ padding:16, marginTop:"auto", borderTop:`1px solid ${C.border}` }}>
        <button
          onClick={resetSpell}
          style={{
            width:"100%", background:"transparent",
            border:`1px solid ${C.border}`, borderRadius:8, padding:"8px",
            color:C.textMid, fontSize:9, cursor:"pointer", letterSpacing:2, fontFamily:"monospace",
          }}>
          CLEAR ALL
        </button>
      </div>
    </div>
  );
}
