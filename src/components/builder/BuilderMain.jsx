import { C } from "../../constants/themes.js";
import { ghostBtn, primaryBtn } from "../../lib/styleHelpers.js";

// ─── BUILDER MAIN PANEL ───────────────────────────────────────────────────────
// Active layer input area. Shows layer label, tip, textarea, nav dots, and cast button.
// Also renders the assembled spell view when showFinal is true.

export default function BuilderMain({
  activeSecs, active, setActive, values, handleChange,
  showFinal, assembled, allReqFilled, filled,
  handleCast, handleCopy, copied, setSaveOpen, resetSpell,
  isImageMode, isMobile,
}) {
  const cur = activeSecs[Math.min(active, activeSecs.length - 1)];

  const castStyle = (on) => ({
    padding:"14px 32px", borderRadius:12, fontSize:12, cursor: on ? "pointer" : "not-allowed",
    letterSpacing:2, fontFamily:"monospace", transition:"all 0.2s",
    background: on ? "linear-gradient(135deg,#7b6cf6,#c084fc)" : C.surface2,
    border: `1px solid ${on ? "transparent" : C.border2}`,
    color: on ? "#fff" : C.textMid,
    boxShadow: on ? "0 4px 20px rgba(167,139,250,0.3)" : "none",
  });

  return (
    <div style={{
      padding: isMobile ? "20px 16px" : "36px 48px",
      maxWidth: 800,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Layer header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10, color:cur.color, letterSpacing:3, fontFamily:"monospace", marginBottom:6 }}>
          {cur.number} — {cur.description.toUpperCase()}
        </div>
        <div style={{ fontSize:isMobile?22:28, color:cur.color, marginBottom:6, letterSpacing:"-0.5px" }}>
          {cur.label}
        </div>
        <div style={{ fontSize:14, color:C.textMid }}>{cur.prompt}</div>
      </div>

      {/* Tip */}
      <div style={{
        fontSize:12, color:`${cur.color}bb`, lineHeight:1.6, padding:"10px 14px",
        background:`${cur.color}0a`, borderRadius:8, border:`1px solid ${cur.color}20`, marginBottom:20,
      }}>
        <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:2 }}>TIP  </span>
        {cur.tip}
        {cur.optional && (
          <span style={{ marginLeft:8, fontFamily:"monospace", fontSize:9, color:C.textDim }}>(OPTIONAL)</span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={values[cur.id] || ""}
        onChange={e => handleChange(cur.id, e.target.value)}
        placeholder={cur.placeholder}
        rows={7}
        style={{
          width:"100%", background:C.surface2, borderRadius:12, padding:"18px 20px",
          color:C.text, fontSize:14, lineHeight:1.8, resize:"vertical", minHeight:160,
          outline:"none", fontFamily:"Georgia, serif", boxSizing:"border-box", transition:"border-color 0.2s",
          border:`1px solid ${values[cur.id]?.trim() ? cur.color+"66" : C.border2}`,
        }}
        onFocus={e => { e.target.style.borderColor = cur.color; }}
        onBlur={e => { e.target.style.borderColor = values[cur.id]?.trim() ? cur.color+"66" : C.border2; }}
      />

      {/* Navigation row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20 }}>
        <button
          onClick={() => setActive(Math.max(0, active - 1))}
          disabled={active === 0}
          style={ghostBtn({ fontSize:10, opacity:active===0?0.3:1, cursor:active===0?"not-allowed":"pointer" })}>
          ← PREV
        </button>

        {/* Dot indicators */}
        <div style={{ display:"flex", gap:6 }}>
          {activeSecs.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setActive(i)}
              style={{
                width:6, height:6, borderRadius:"50%", cursor:"pointer", transition:"all 0.2s",
                background: values[s.id]?.trim() ? s.color : (i===active ? C.textMid : C.border2),
              }}
            />
          ))}
        </div>

        {active < activeSecs.length - 1
          ? <button onClick={() => setActive(active + 1)} style={ghostBtn({ fontSize:10 })}>NEXT →</button>
          : <button onClick={allReqFilled ? handleCast : undefined} style={castStyle(allReqFilled)}>
              {allReqFilled ? "CAST SPELL ✦" : "FILL REQUIRED"}
            </button>
        }
      </div>

      {/* Early cast button (when req filled but not on last layer) */}
      {allReqFilled && active < activeSecs.length - 1 && (
        <div style={{ marginTop:16, textAlign:"center" }}>
          <button onClick={handleCast} style={castStyle(true)}>CAST SPELL ✦</button>
        </div>
      )}

      {/* Assembled spell view */}
      {showFinal && (
        <div style={{
          background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:14, padding:24, marginTop:32,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:9, letterSpacing:3, color:C.textMid, fontFamily:"monospace" }}>YOUR ASSEMBLED PROMPT</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setSaveOpen(true)} style={ghostBtn({ padding:"6px 14px", fontSize:9 })}>
                SAVE TO CODEX ◈
              </button>
              <button onClick={handleCopy} style={primaryBtn({ padding:"6px 16px", fontSize:9 })}>
                {copied ? "COPIED ✓" : "COPY ✦"}
              </button>
            </div>
          </div>
          <div style={{ fontSize:13, color:"#b0acaa", lineHeight:2, whiteSpace:"pre-wrap", fontFamily:"Georgia, serif" }}>
            {assembled}
          </div>
          <div style={{
            marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <div style={{ fontSize:11, color:C.textMid }}>{filled} layer{filled!==1?"s":""} · {assembled.length} characters</div>
            <button onClick={resetSpell} style={ghostBtn({ padding:"6px 14px", fontSize:9 })}>NEW SPELL</button>
          </div>
        </div>
      )}

      {/* Image mode badge */}
      {isImageMode && (
        <div style={{
          marginTop:16, padding:"8px 14px",
          background:`${C.pink}0a`, border:`1px solid ${C.pink}22`,
          borderRadius:8, fontSize:11, color:C.pink, fontFamily:"monospace", letterSpacing:1,
        }}>
          ◈ IMAGE MODE — layers assembled for generative AI
        </div>
      )}
    </div>
  );
}
