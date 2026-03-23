import { C } from "../../constants/themes.js";
import { ghostBtn, primaryBtn } from "../../lib/styleHelpers.js";

// ─── SAVE SPELL MODAL ─────────────────────────────────────────────────────────
// Modal dialog for naming and saving a cast spell to the Codex.

export default function SavePromptModal({ saveForm, setSaveForm, handleSave, onClose }) {
  return (
    <div
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:60,
        backdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20,
      }}
      onClick={onClose}>
      <div
        style={{
          background:C.surface, border:`1px solid ${C.border2}`, borderRadius:16,
          padding:28, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontSize:9, letterSpacing:3, color:C.purple, fontFamily:"monospace", marginBottom:4 }}>SAVE TO CODEX</div>
        <div style={{ fontSize:20, color:C.text, fontStyle:"italic", marginBottom:20 }}>◈ Name Your Spell</div>

        {/* Title */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:C.textMid, letterSpacing:2, fontFamily:"monospace", marginBottom:6, display:"block" }}>
            SPELL TITLE
          </label>
          <input
            value={saveForm.title}
            onChange={e => setSaveForm(f => ({ ...f, title:e.target.value }))}
            placeholder="My Research Brief"
            autoFocus
            style={{
              width:"100%", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:10,
              padding:"12px 14px", color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:C.textMid, letterSpacing:2, fontFamily:"monospace", marginBottom:6, display:"block" }}>
            DESCRIPTION (OPTIONAL)
          </label>
          <input
            value={saveForm.description}
            onChange={e => setSaveForm(f => ({ ...f, description:e.target.value }))}
            placeholder="What this spell is for…"
            style={{
              width:"100%", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:10,
              padding:"12px 14px", color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box",
            }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:10, color:C.textMid, letterSpacing:2, fontFamily:"monospace", marginBottom:6, display:"block" }}>
            CATEGORY
          </label>
          <select
            value={saveForm.category}
            onChange={e => setSaveForm(f => ({ ...f, category:e.target.value }))}
            style={{
              width:"100%", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:10,
              padding:"12px 14px", color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box",
            }}>
            <option>Language Models</option>
            <option>Image Generation</option>
          </select>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={ghostBtn()}>CANCEL</button>
          <button
            onClick={handleSave}
            disabled={!saveForm.title.trim()}
            style={primaryBtn({ flex:1, opacity:saveForm.title.trim() ? 1 : 0.5 })}>
            SAVE ◈
          </button>
        </div>
      </div>
    </div>
  );
}
