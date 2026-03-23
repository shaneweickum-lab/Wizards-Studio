import { useState, useEffect, useRef, useMemo } from "react";
import { C } from "./constants/themes.js";
import { SECTIONS, IMAGE_SECTIONS } from "./constants/sections.js";
import { detectImageMode } from "./lib/detectImageMode.js";
import { scorePrompt } from "./lib/scorePrompt.js";
import { loadSpells, saveSpells } from "./lib/storage.js";

import AuthScreen from "./components/auth/AuthScreen.jsx";
import Header from "./components/layout/Header.jsx";
import BuilderSidebar from "./components/builder/BuilderSidebar.jsx";
import MobileBuilder from "./components/builder/MobileBuilder.jsx";
import BuilderMain from "./components/builder/BuilderMain.jsx";
import QualityScore from "./components/builder/QualityScore.jsx";
import CodexPanel from "./components/codex/CodexPanel.jsx";
import SavePromptModal from "./components/ui/SavePromptModal.jsx";

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [intro,     setIntro]     = useState(true);
  const [values,    setValues]    = useState({});
  const [active,    setActive]    = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [codexCat,  setCodexCat]  = useState("My Spells");
  const [mySpells,  setMySpells]  = useState(loadSpells);
  const [saveOpen,  setSaveOpen]  = useState(false);
  const [saveForm,  setSaveForm]  = useState({ title:"", description:"", category:"Language Models" });
  const [toast,     setToast]     = useState(null);
  const [view,      setView]      = useState("builder");

  const castRef      = useRef(false);
  const saveTimerRef = useRef(null);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const k = e => {
      if (e.key === "Escape") { setCodexOpen(false); setSaveOpen(false); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  // Derived state
  const isImageMode  = detectImageMode(values);
  const activeSecs   = isImageMode ? IMAGE_SECTIONS : SECTIONS;
  const filled       = activeSecs.filter(s => values[s.id]?.trim()).length;
  const allReqFilled = activeSecs.filter(s => !s.optional).every(s => values[s.id]?.trim());
  const progress     = (filled / activeSecs.length) * 100;
  const assembled    = isImageMode
    ? activeSecs.filter(s => values[s.id]?.trim()).map(s => values[s.id].trim()).join(", ")
    : activeSecs.filter(s => values[s.id]?.trim()).map(s => values[s.id].trim()).join("\n\n");
  const quality = useMemo(() => scorePrompt(values, assembled, isImageMode), [assembled, isImageMode]);

  // Helpers
  const showToast = (msg, color = C.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2400);
  };

  const handleChange = (id, val) => setValues(v => ({ ...v, [id]:val }));

  const handleCast = () => {
    setShowFinal(true);
    if (!castRef.current) {
      castRef.current = true;
      saveTimerRef.current = setTimeout(() => setSaveOpen(true), 600);
    }
  };

  const handleCopy = () => {
    const tryClipboard = () => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(assembled);
      }
      return Promise.reject("no clipboard api");
    };

    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = assembled;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        document.body.removeChild(ta);
        return Promise.resolve();
      } catch (e) {
        document.body.removeChild(ta);
        return Promise.reject(e);
      }
    };

    tryClipboard()
      .catch(fallback)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast("Copied to clipboard");
      })
      .catch(() => showToast("Copy failed — select text manually", C.orange));
  };

  const resetSpell = () => {
    clearTimeout(saveTimerRef.current);
    setValues({}); setActive(0); setShowFinal(false);
    setSaveOpen(false); setView("builder"); castRef.current = false;
  };

  const loadSpell = (entry) => {
    clearTimeout(saveTimerRef.current);
    const merged = {};
    SECTIONS.forEach(s => { merged[s.id] = entry.spell?.[s.id] || ""; });
    setValues(merged); setCodexOpen(false); setActive(0);
    setShowFinal(false); setSaveOpen(false); setView("builder"); castRef.current = false;
  };

  const handleSave = () => {
    if (!saveForm.title.trim()) return;
    const spell = {};
    SECTIONS.forEach(s => { spell[s.id] = values[s.id] || ""; });
    const entry = {
      title: saveForm.title,
      description: saveForm.description,
      category: saveForm.category,
      spell,
      savedAt: Date.now(),
    };
    const updated = [entry, ...mySpells];
    setMySpells(updated);
    saveSpells(updated);
    setSaveOpen(false);
    setSaveForm({ title:"", description:"", category:"Language Models" });
    showToast("Saved to Codex ◈");
  };

  const deleteMySpell = i => {
    const updated = mySpells.filter((_, j) => j !== i);
    setMySpells(updated);
    saveSpells(updated);
  };

  const curSec = activeSecs[Math.min(active, activeSecs.length - 1)];

  return (
    <>
      {/* Splash / intro animation */}
      {intro && <AuthScreen onDone={() => setIntro(false)} />}

      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Georgia,serif", display:"flex", flexDirection:"column" }}>
        <style>{`
          * { box-sizing: border-box; }
          textarea::placeholder, input::placeholder { color: #30303e; }
          textarea:focus, input:focus { outline: none; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
          select option { background: #13131f; }
        `}</style>

        {/* Navigation */}
        <Header
          filled={filled}
          quality={quality}
          view={view}
          setView={setView}
          codexOpen={codexOpen}
          setCodexOpen={setCodexOpen}
          allReqFilled={allReqFilled}
          showFinal={showFinal}
          handleCast={handleCast}
        />

        {/* Mobile layer tabs */}
        {isMobile && (
          <MobileBuilder
            activeSecs={activeSecs}
            active={active}
            setActive={setActive}
            values={values}
            filled={filled}
            quality={quality}
            view={view}
            setView={setView}
          />
        )}

        {/* Progress bar */}
        <div style={{ height:2, background:C.border, flexShrink:0 }}>
          <div style={{
            width:`${progress}%`, height:"100%", transition:"width 0.4s",
            background:`linear-gradient(90deg,${curSec.color}88,${curSec.color})`,
          }} />
        </div>

        {/* Main content area */}
        <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 54px)" }}>
          {/* Desktop sidebar */}
          {!isMobile && (
            <BuilderSidebar
              activeSecs={activeSecs}
              active={active}
              setActive={setActive}
              values={values}
              filled={filled}
              progress={progress}
              quality={quality}
              view={view}
              setView={setView}
              resetSpell={resetSpell}
            />
          )}

          {/* Scrollable content */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {view === "quality"
              ? <QualityScore
                  quality={quality}
                  activeSecs={activeSecs}
                  allReqFilled={allReqFilled}
                  isMobile={isMobile}
                  setActive={setActive}
                  setView={setView}
                  handleCast={handleCast}
                />
              : <BuilderMain
                  activeSecs={activeSecs}
                  active={active}
                  setActive={setActive}
                  values={values}
                  handleChange={handleChange}
                  showFinal={showFinal}
                  assembled={assembled}
                  allReqFilled={allReqFilled}
                  filled={filled}
                  handleCast={handleCast}
                  handleCopy={handleCopy}
                  copied={copied}
                  setSaveOpen={setSaveOpen}
                  resetSpell={resetSpell}
                  isImageMode={isImageMode}
                  isMobile={isMobile}
                />
            }
          </div>
        </div>

        {/* Overlays */}
        {codexOpen && (
          <CodexPanel
            codexCat={codexCat}
            setCodexCat={setCodexCat}
            mySpells={mySpells}
            deleteMySpell={deleteMySpell}
            loadSpell={loadSpell}
            setCodexOpen={setCodexOpen}
            isMobile={isMobile}
          />
        )}

        {saveOpen && (
          <SavePromptModal
            saveForm={saveForm}
            setSaveForm={setSaveForm}
            handleSave={handleSave}
            onClose={() => setSaveOpen(false)}
          />
        )}

        {/* Toast notification */}
        {toast && (
          <div style={{
            position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
            background:C.surface, border:`1px solid ${toast.color}44`, borderRadius:10, padding:"10px 20px",
            fontSize:12, color:toast.color, fontFamily:"monospace", letterSpacing:1,
            zIndex:100, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", whiteSpace:"nowrap",
          }}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
