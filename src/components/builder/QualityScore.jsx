import { C } from "../../constants/themes.js";
import { ghostBtn, primaryBtn } from "../../lib/styleHelpers.js";

// ─── QUALITY SCORE VIEW ───────────────────────────────────────────────────────
// Full quality analysis panel. Shows composite score ring, per-dimension cards,
// and "what to do next" recommendations.

export default function QualityScore({ quality, activeSecs, allReqFilled, isMobile, setActive, setView, handleCast }) {
  return (
    <div style={{ padding:isMobile?"20px 16px":"36px 48px", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, letterSpacing:3, color:C.textMid, fontFamily:"monospace", marginBottom:6 }}>SPELL ANALYSIS</div>
        <div style={{ fontSize:isMobile?22:28, color:C.text, marginBottom:6, letterSpacing:"-0.5px" }}>Quality Checker</div>
        <div style={{ fontSize:13, color:C.textMid }}>A real-time score across four dimensions. Improve any layer to watch it change.</div>
      </div>

      {/* Main score card */}
      <div style={{
        background:quality.verdictBg, border:`1px solid ${quality.verdictBorder}`,
        borderRadius:16, padding:"24px 26px", marginBottom:20,
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:3, color:quality.verdictColor, fontFamily:"monospace", marginBottom:8 }}>PROMPT QUALITY SCORE</div>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:48, fontWeight:"bold", color:quality.verdictColor, fontFamily:"monospace", lineHeight:1 }}>
                {quality.composite}
              </div>
              <div>
                <div style={{ fontSize:15, color:C.text, marginBottom:3 }}>{quality.verdictIcon} {quality.verdict}</div>
                <div style={{ fontSize:11, color:C.textMid }}>out of 100</div>
              </div>
            </div>
          </div>
          <svg width="76" height="76" style={{ flexShrink:0 }}>
            <circle cx="38" cy="38" r="30" fill="none" stroke={C.border2} strokeWidth="6"/>
            <circle cx="38" cy="38" r="30" fill="none" stroke={quality.verdictColor} strokeWidth="6"
              strokeDasharray={`${Math.round(quality.composite/100*188.5)} 188.5`}
              strokeLinecap="round" strokeDashoffset="47"
              style={{ transform:"rotate(-90deg)", transformOrigin:"38px 38px", transition:"stroke-dasharray 0.8s ease" }}/>
            <text x="38" y="43" textAnchor="middle" fill={quality.verdictColor} fontSize="13" fontFamily="monospace" fontWeight="bold">
              {quality.composite}
            </text>
          </svg>
        </div>
        <div style={{ height:4, background:C.border, borderRadius:2, marginBottom:14, overflow:"hidden" }}>
          <div style={{ width:`${quality.composite}%`, height:"100%", background:`linear-gradient(90deg,${quality.verdictColor}88,${quality.verdictColor})`, borderRadius:2, transition:"width 0.8s ease" }}/>
        </div>
        <div style={{ fontSize:13, color:"#8a8aa8", lineHeight:1.8, fontStyle:"italic" }}>"{quality.advice}"</div>
      </div>

      {/* Dimension cards */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:10, marginBottom:24 }}>
        {quality.scores.map(s => {
          const col = s.raw>=80?"#4ade80":s.raw>=60?"#fbbf24":s.raw>=40?"#fb923c":"#f87171";
          return (
            <div key={s.id} style={{ background:C.surface2, border:`1px solid ${col}22`, borderRadius:12, padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ color:col, fontSize:13 }}>{s.icon}</span>
                  <span style={{ fontSize:10, color:C.text, fontFamily:"monospace", letterSpacing:1 }}>{s.label.toUpperCase()}</span>
                </div>
                <span style={{ fontSize:14, color:col, fontFamily:"monospace", fontWeight:"bold" }}>{s.raw}</span>
              </div>
              <div style={{ height:3, background:C.border, borderRadius:2, marginBottom:10 }}>
                <div style={{ width:`${s.raw}%`, height:"100%", background:col, borderRadius:2, transition:"width 0.6s ease" }}/>
              </div>
              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{s.detail}</div>
              <button
                onClick={() => {
                  const idx = activeSecs.findIndex(sec => sec.id === s.id);
                  if (idx >= 0) { setActive(idx); setView("builder"); }
                }}
                style={{
                  marginTop:10, background:"none", border:`1px solid ${col}33`, borderRadius:6,
                  padding:"4px 10px", color:col, fontSize:8, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace",
                }}>
                EDIT LAYER →
              </button>
            </div>
          );
        })}
      </div>

      {/* What to do next */}
      <div style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:12, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ fontSize:9, letterSpacing:3, color:C.textMid, fontFamily:"monospace", marginBottom:10 }}>WHAT TO DO NEXT</div>
        {quality.composite < 82
          ? [...quality.scores].sort((a,b) => a.raw - b.raw).slice(0, 2).map(s => {
              const col = s.raw >= 60 ? "#fbbf24" : "#fb923c";
              return (
                <div key={s.id} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ color:col, fontSize:14, flexShrink:0, marginTop:1 }}>↑</span>
                  <div>
                    <div style={{ fontSize:12, color:C.text, marginBottom:3 }}>
                      Improve <span style={{ color:col }}>{s.label}</span> ({s.raw}/100)
                    </div>
                    <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{s.detail}</div>
                  </div>
                </div>
              );
            })
          : <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:20 }}>✦</span>
              <div style={{ fontSize:13, color:C.textMid, lineHeight:1.7 }}>Your spell is strong. Cast it and see what comes back.</div>
            </div>
        }
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <button onClick={() => setView("builder")} style={ghostBtn()}>← BACK TO BUILDER</button>
        {allReqFilled && (
          <button onClick={() => { handleCast(); setView("builder"); }} style={primaryBtn()}>CAST SPELL ✦</button>
        )}
      </div>
    </div>
  );
}
