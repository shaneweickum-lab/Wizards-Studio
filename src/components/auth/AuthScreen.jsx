import { useState, useEffect } from "react";
import { RUNES } from "../../constants/themes.js";
import { getAccounts, saveAccounts, setActiveEmail } from "../../lib/storage.js";
import { sendWelcomeEmail, sendResetEmail, EMAIL_CONFIGURED } from "../../lib/emailService.js";
import { generateToken, saveResetToken, getResetToken, clearResetToken } from "../../lib/tokenHelpers.js";

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
// Login, signup, forgot password, and reset password flows.

export default function AuthScreen({ onLogin }) {
  const [mode,            setMode]            = useState("login");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [showPw,          setShowPw]          = useState(false);
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode,       setResetCode]       = useState("");
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState("");
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tok = p.get("reset"), em = p.get("email");
    if (tok && em) {
      setMode("reset");
      setEmail(decodeURIComponent(em));
      setResetCode(tok);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const [floatRunes] = useState(() =>
    Array.from({ length: 20 }, () => ({
      glyph: RUNES[Math.floor(Math.random() * RUNES.length)],
      x: Math.random() * 100, y: Math.random() * 100,
      size: 14 + Math.random() * 20,
      color: ["#a78bfa22","#f472b622","#34d39922","#60a5fa22","#fb923c22"][Math.floor(Math.random() * 5)],
      dur: 8 + Math.random() * 12, delay: Math.random() * 8,
    }))
  );

  const hashPw  = pw => btoa(pw + "_sb_salt_v1");
  const clear   = ()  => { setError(""); setSuccess(""); };
  const go      = m   => { setMode(m); clear(); };

  const inputStyle = {
    width:"100%", background:"#0d0d14", border:"1px solid #2a2a3a",
    borderRadius:10, padding:"14px 16px", color:"#e8e4d9", fontSize:14,
    fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s",
  };

  const Spinner = () => (
    <span style={{ display:"inline-block", width:14, height:14, border:"2px solid #ffffff44", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
  );
  const ErrBox = ({ msg }) => msg ? (
    <div style={{ background:"#1a0f0f", border:"1px solid #3a1a1a", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#f87171", fontFamily:"monospace" }}>✕ {msg}</div>
  ) : null;
  const OkBox = ({ msg }) => msg ? (
    <div style={{ background:"#0f1a14", border:"1px solid #1a3a24", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#4ade80", fontFamily:"monospace", lineHeight:1.6 }}>✓ {msg}</div>
  ) : null;
  const BigBtn = ({ onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", background:"linear-gradient(135deg,#7b6cf6,#c084fc)", border:"none", borderRadius:10, padding:"14px", color:"#fff", fontSize:13, cursor:disabled?"not-allowed":"pointer", letterSpacing:2, fontFamily:"monospace", opacity:disabled?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
      {children}
    </button>
  );
  const BackBtn = ({ to, label = "← BACK" }) => (
    <button onClick={() => go(to)} style={{ background:"none", border:"none", color:"#5a5a7a", fontSize:11, cursor:"pointer", fontFamily:"monospace", letterSpacing:1, padding:0 }}>{label}</button>
  );

  const handleSubmit = () => {
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    clear(); setLoading(true);
    setTimeout(async () => {
      const accounts = getAccounts();
      const key = email.toLowerCase().trim();
      if (mode === "signup") {
        if (accounts[key]) { setError("An account with this email already exists."); setLoading(false); return; }
        accounts[key] = { email: key, password: hashPw(password), createdAt: Date.now() };
        saveAccounts(accounts); setActiveEmail(key);
        sendWelcomeEmail(key);
        setSuccess("Account created! Entering the Playground…");
        setTimeout(() => onLogin(key), 1000);
      } else {
        if (!accounts[key]) { setError("No account found with this email."); setLoading(false); return; }
        if (accounts[key].password !== hashPw(password)) { setError("Incorrect password."); setLoading(false); return; }
        setActiveEmail(key);
        setSuccess("Welcome back. Entering the Playground…");
        setTimeout(() => onLogin(key), 900);
      }
    }, 600);
  };

  const handleForgot = () => {
    if (!email.trim() || !email.includes("@")) { setError("Enter your account email above."); return; }
    clear(); setLoading(true);
    setTimeout(async () => {
      const key = email.toLowerCase().trim();
      const accounts = getAccounts();
      if (accounts[key]) {
        const token = generateToken();
        saveResetToken(key, token);
        const result = await sendResetEmail(key, token);
        if (!EMAIL_CONFIGURED) {
          setSuccess(`Demo mode — your reset code is: ${token}\n(In production this arrives in your inbox)`);
        } else if (result.ok) {
          setSuccess("Reset link sent. Check your inbox — expires in 30 minutes.");
        } else {
          setError("Couldn't send the email. Try again or contact support.");
          setLoading(false); return;
        }
      } else {
        setSuccess("If that email has an account, a reset link is on its way.");
      }
      setLoading(false);
    }, 800);
  };

  const handleReset = () => {
    if (!resetCode.trim()) { setError("Enter the reset code from your email."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    clear(); setLoading(true);
    setTimeout(() => {
      const key = email.toLowerCase().trim();
      const stored = getResetToken(key);
      if (!stored || stored !== resetCode.trim().toUpperCase()) {
        setError("Invalid or expired code. Request a new one."); setLoading(false); return;
      }
      const accounts = getAccounts();
      if (!accounts[key]) { setError("Account not found."); setLoading(false); return; }
      accounts[key].password = hashPw(newPassword);
      saveAccounts(accounts); clearResetToken(key); setActiveEmail(key);
      setSuccess("Password updated. Signing you in…");
      setTimeout(() => onLogin(key), 1200);
    }, 700);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{`
        @keyframes floatRune { 0%,100%{transform:translateY(0) rotate(0deg);opacity:0.6} 50%{transform:translateY(-20px) rotate(10deg);opacity:1} }
        @keyframes authFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .auth-input:focus { border-color:#a78bfa !important; }
      `}</style>

      {floatRunes.map((r, i) => (
        <div key={i} style={{ position:"absolute", left:`${r.x}%`, top:`${r.y}%`, fontSize:r.size, color:r.color, animation:`floatRune ${r.dur}s ${r.delay}s ease-in-out infinite`, pointerEvents:"none", userSelect:"none" }}>{r.glyph}</div>
      ))}

      <div style={{ width:"100%", maxWidth:420, padding:"0 24px", animation:"authFadeIn 0.5s ease", position:"relative", zIndex:10 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:40, marginBottom:8, textShadow:"0 0 30px rgba(167,139,250,0.5)" }}>✦</div>
          <div style={{ fontSize:26, color:"#e8e4d9", letterSpacing:"-0.5px", fontStyle:"italic", fontFamily:"Georgia,serif", marginBottom:4 }}>Wizards Playground</div>
          <div style={{ fontSize:10, color:"#3a3a5a", letterSpacing:4, fontFamily:"monospace" }}>WORDS ARE SPELLS. YOUR PROMPTS SHOULD BE TOO.</div>
        </div>

        <div style={{ background:"#0d0d14", border:"1px solid #2a2a3a", borderRadius:18, padding:"32px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>

          {mode === "forgot" && <>
            <BackBtn to="login" label="← BACK TO SIGN IN" />
            <div style={{ marginTop:18, marginBottom:22 }}>
              <div style={{ fontSize:18, color:"#e8e4d9", marginBottom:6 }}>Forgot your password?</div>
              <div style={{ fontSize:12, color:"#5a5a7a", lineHeight:1.7 }}>Enter your email and we'll send a reset link. It expires in 30 minutes.</div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>YOUR EMAIL</div>
              <input className="auth-input" type="email" value={email} onChange={e=>{setEmail(e.target.value);clear();}} onKeyDown={e=>e.key==="Enter"&&handleForgot()} placeholder="your@email.com" style={inputStyle}/>
            </div>
            <ErrBox msg={error}/><OkBox msg={success}/>
            {!EMAIL_CONFIGURED && !success && (
              <div style={{ background:"#13100a", border:"1px solid #3a2a1a", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:11, color:"#fbbf24", fontFamily:"monospace", lineHeight:1.6 }}>
                ⚠ EmailJS not configured — reset code will appear on screen.{" "}
                <a href="https://emailjs.com" target="_blank" rel="noreferrer" style={{ color:"#a78bfa" }}>Set up EmailJS →</a>
              </div>
            )}
            <BigBtn onClick={handleForgot} disabled={loading}>{loading ? <><Spinner/> SENDING…</> : "SEND RESET LINK ✦"}</BigBtn>
            {success && (
              <div style={{ marginTop:16, textAlign:"center" }}>
                <button onClick={()=>go("reset")} style={{ background:"none", border:"none", color:"#a78bfa", fontSize:11, cursor:"pointer", fontFamily:"monospace", letterSpacing:1 }}>I have my reset code →</button>
              </div>
            )}
          </>}

          {mode === "reset" && <>
            <BackBtn to="forgot" />
            <div style={{ marginTop:18, marginBottom:22 }}>
              <div style={{ fontSize:18, color:"#e8e4d9", marginBottom:6 }}>Set a new password</div>
              <div style={{ fontSize:12, color:"#5a5a7a", lineHeight:1.7 }}>Enter the code from your email and choose a new password.</div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>EMAIL</div>
              <input className="auth-input" type="email" value={email} onChange={e=>{setEmail(e.target.value);clear();}} placeholder="your@email.com" style={inputStyle}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>RESET CODE</div>
              <input className="auth-input" value={resetCode} onChange={e=>{setResetCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""));clear();}} placeholder="8-CHARACTER CODE" style={{ ...inputStyle, fontFamily:"monospace", letterSpacing:4, textTransform:"uppercase" }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>NEW PASSWORD</div>
              <div style={{ position:"relative" }}>
                <input className="auth-input" type={showPw?"text":"password"} value={newPassword} onChange={e=>{setNewPassword(e.target.value);clear();}} placeholder="At least 6 characters" style={inputStyle}/>
                <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#5a5a7a", cursor:"pointer", fontSize:11, fontFamily:"monospace" }}>{showPw?"HIDE":"SHOW"}</button>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>CONFIRM PASSWORD</div>
              <input className="auth-input" type={showPw?"text":"password"} value={confirmPassword} onChange={e=>{setConfirmPassword(e.target.value);clear();}} onKeyDown={e=>e.key==="Enter"&&handleReset()} placeholder="Repeat new password" style={{ ...inputStyle, borderColor: confirmPassword?(confirmPassword===newPassword?"#4ade8066":"#f8717166"):"#2a2a3a" }}/>
              {confirmPassword && confirmPassword!==newPassword && <div style={{ fontSize:11, color:"#f87171", marginTop:4, fontFamily:"monospace" }}>Passwords don't match</div>}
            </div>
            <ErrBox msg={error}/><OkBox msg={success}/>
            <BigBtn onClick={handleReset} disabled={loading}>{loading ? <><Spinner/> UPDATING…</> : "UPDATE PASSWORD ✦"}</BigBtn>
          </>}

          {(mode==="login"||mode==="signup") && <>
            <div style={{ display:"flex", background:"#13131f", borderRadius:10, padding:4, marginBottom:28 }}>
              {["login","signup"].map(m => (
                <button key={m} onClick={()=>go(m)} style={{ flex:1, background:mode===m?"#0a0a14":"transparent", border:"none", borderRadius:8, padding:"10px", color:mode===m?"#e8e4d9":"#4a4a6a", fontSize:12, cursor:"pointer", letterSpacing:2, fontFamily:"monospace", transition:"all 0.2s" }}>
                  {m==="login"?"SIGN IN":"SIGN UP"}
                </button>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>EMAIL</div>
              <input className="auth-input" type="email" value={email} onChange={e=>{setEmail(e.target.value);clear();}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="your@email.com" style={inputStyle}/>
            </div>
            <div style={{ marginBottom:mode==="login"?8:22 }}>
              <div style={{ fontSize:10, color:"#5a5a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:6 }}>PASSWORD</div>
              <div style={{ position:"relative" }}>
                <input className="auth-input" type={showPw?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);clear();}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder={mode==="signup"?"At least 6 characters":"••••••••"} style={inputStyle}/>
                <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#5a5a7a", cursor:"pointer", fontSize:11, fontFamily:"monospace" }}>{showPw?"HIDE":"SHOW"}</button>
              </div>
            </div>
            {mode==="login" && (
              <div style={{ textAlign:"right", marginBottom:20 }}>
                <button onClick={()=>go("forgot")} style={{ background:"none", border:"none", color:"#5a5a7a", fontSize:11, cursor:"pointer", fontFamily:"monospace", letterSpacing:1 }}>Forgot password?</button>
              </div>
            )}
            <ErrBox msg={error}/><OkBox msg={success}/>
            <BigBtn onClick={handleSubmit} disabled={loading}>
              {loading ? <><Spinner/> CASTING…</> : mode==="login" ? "ENTER THE PLAYGROUND ✦" : "CREATE YOUR ACCOUNT ✦"}
            </BigBtn>
          </>}
        </div>

        {(mode==="login"||mode==="signup") && (
          <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:"#3a3a5a", fontFamily:"monospace", letterSpacing:1 }}>
            {mode==="login"?"No account?":"Already a caster?"}{" "}
            <button onClick={()=>go(mode==="login"?"signup":"login")} style={{ background:"none", border:"none", color:"#a78bfa", fontSize:11, cursor:"pointer", fontFamily:"monospace", letterSpacing:1 }}>
              {mode==="login"?"Sign up free":"Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
