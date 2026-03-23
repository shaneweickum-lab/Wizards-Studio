import { useState, useEffect, useRef, useMemo } from "react";
import { SECTIONS, IMAGE_SECTIONS } from "./constants/sections.js";
import { DEFAULT_CODEX, CAT_COLORS } from "./constants/codex.js";
import { RANKS, XP_REWARDS, RANK_SYMBOLS } from "./constants/ranks.js";
import { detectImageMode } from "./lib/detectImageMode.js";
import { loadAccountState, saveAccountField, accountKey, getAccounts, getActiveEmail, setActiveEmail } from "./lib/storage.js";
import { getRankInfo } from "./lib/rankHelpers.js";
import { isHandleTaken, reserveHandle, validateHandle } from "./lib/handleHelpers.js";
import { GRIMOIRE } from "./data/grimoire.js";
import IntroScreen from "./components/auth/IntroScreen.jsx";
import AuthScreen from "./components/auth/AuthScreen.jsx";

// ─── INLINE STYLE HELPERS ────────────────────────────────────────────────────
// Used within SpellBookApp closures (btn/ghost match new code naming)

// ─── PLAYGROUND MOCK DATA (replaced by backend on launch) ────────────────────
const MOCK_POSTS = [
{ id:"p1", authorHandle:"Seraphine", authorAvatar:"🔮", authorRank:"Archmage", type:"win", text:"Just got my first fully AI-assisted chapter done and it sounds EXACTLY like me. The voice test passed on the first try. Six months ago I didn't believe this was possible.", likes:24, comments:[], createdAt: Date.now()-3600000*2, spell:null },
{ id:"p2", authorHandle:"CorvinDusk", authorAvatar:"🦉", authorRank:"Conjurer", type:"prompt", text:"This image prompt has been printing gold for me. Sharing it with the coven:", likes:18, comments:[], createdAt: Date.now()-3600000*5, spell:{anchor:"Cinematic portrait, 35mm film", feeling:"Quiet power", voice:"Paolo Sorrentino visual language", constraint:"2:3 ratio, photorealistic, no AI smoothing", permission:"One unexpected lighting choice"} },
{ id:"p3", authorHandle:"Lyra.Voss", authorAvatar:"⚗️", authorRank:"Mage", type:"journey", text:"Week 3 of the Bottle Your Brilliance course. My outline is done and I actually love it. Every chapter feels like mine. The Mental Models Map exercise changed everything — I finally understand what makes my angle different.", likes:41, comments:[], createdAt: Date.now()-3600000*11, spell:null },
{ id:"p4", authorHandle:"Ember_Wren", authorAvatar:"🌙", authorRank:"Scribe", type:"win", text:"Hit Level 7 today — Conjurer rank unlocked. The Grimoire lessons are genuinely changing how I think about prompting. The Permission layer alone has saved me hours of back-and-forth.", likes:15, comments:[], createdAt: Date.now()-3600000*18, spell:null },
{ id:"p5", authorHandle:"Zephyr.Arc", authorAvatar:"⚡", authorRank:"Initiate", type:"prompt", text:"My go-to LLM prompt for deep research. The structure consistently returns better output than anything I was doing before:", likes:33, comments:[], createdAt: Date.now()-3600000*26, spell:{anchor:"You are a world-class research analyst", feeling:"I need the real picture, not the consensus", voice:"Investigative journalist with a PhD", constraint:"Core Claim → Evidence For → Evidence Against → Synthesis", permission:"Say 'the mainstream view is probably wrong here' if evidence supports it"} },
];
const MOCK_MESSAGES = {
"Seraphine": [
{ id:"m1", from:"Seraphine", text:"Your post about the Permission layer really resonated with me. How long did it take to click?", ts: Date.now()-3600000*4 },
{ id:"m2", from:"me", text:"Honestly about three sessions! Once I stopped trying to control every detail it opened everything up.", ts: Date.now()-3600000*3 },
{ id:"m3", from:"Seraphine", text:"That's exactly what happened to me. The trust part is the whole lesson isn't it.", ts: Date.now()-3600000*2 },
],
"CorvinDusk": [
{ id:"m4", from:"CorvinDusk", text:"Welcome to the Playground! Love what you've been building.", ts: Date.now()-3600000*24 },
],
};
const MOCK_FRIENDS = ["Seraphine","CorvinDusk","Lyra.Voss"];

function SpellBookApp({ userEmail, onLogout }) {
const init = loadAccountState(userEmail);
const save = (key, val) => saveAccountField(userEmail, key, val);

const [profile,      setProfileState]      = useState(init.profile);
const [xp,           setXPState]           = useState(init.xp);
const [mySpells,     setMySpellsState]     = useState(init.mySpells);
const [isPro,           setIsPro]            = useState(init.isPro);
const loadUnlocked = () => { try { return new Set(JSON.parse(localStorage.getItem(accountKey(userEmail,"unlocked_courses"))||"[]")); } catch { return new Set(); } };
const [unlockedCourses, setUnlockedCoursesState] = useState(loadUnlocked);
const saveUnlocked = (set) => { setUnlockedCoursesState(set); localStorage.setItem(accountKey(userEmail,"unlocked_courses"), JSON.stringify([...set])); };
const hasAccess = (courseId) => isPro || unlockedCourses.has(courseId);
const [lessonsRead,  setLessonsRead]       = useState(init.lessonsRead);

const [view,         setView]              = useState("builder");
const [active,       setActive]            = useState(0);
const [values,       setValues]            = useState({});
const [showFinal,    setShowFinal]         = useState(false);
const [copied,       setCopied]            = useState(false);
const [isMobile,     setIsMobile]          = useState(false);

const [codexOpen,    setCodexOpen]         = useState(false);
const [codexCat,     setCodexCat]          = useState("My Spells");
const [loadedSpell,  setLoadedSpell]       = useState(null);
const [loadedSpellCategory, setLoadedSpellCategory] = useState(null);

const [profileOpen,  setProfileOpen]       = useState(false);
const [profileForm,  setProfileForm]       = useState({ name:"", title:"", avatar:"", handle:"" });
const [profileEdit,  setProfileEdit]       = useState(false);
const [profileTab,   setProfileTab]        = useState("profile");
const [handleStatus, setHandleStatus]      = useState(null);

// ── TUTORIAL SYSTEM ───────────────────────────────────────────────────────────
const loadTutorialDone = () => { try { return localStorage.getItem(accountKey(userEmail,"tutorial_done"))==="true"; } catch { return false; } };
const [tutorialActive, setTutorialActive]  = useState(() => !loadTutorialDone());
const [tutorialStep,   setTutorialStep]    = useState(0);
const tutorialRefs = useRef({});

const TUTORIAL_STEPS = [
{ id:"welcome",    target:null,        title:"Welcome to Wizards Playground ✦", body:"Words are spells — your prompts should be too. This quick tour will show you the five parts of the app. Takes about 60 seconds.", placement:"center" },
{ id:"builder",    target:"nav-builder",   title:"The Spell Builder", body:"This is your prompt construction studio. Build any AI prompt in five structured layers — Anchor, Feeling, Voice, Constraint, Permission — each one sharpening your intention.", placement:"bottom" },
{ id:"sections",   target:"section-0",     title:"The Five Layers", body:"Each section is one layer of your spell. Fill them in order — or jump around. Every section you complete earns XP toward your next rank.", placement:"right" },
{ id:"codex",      target:"nav-codex",     title:"The Codex ◈", body:"A library of pre-built spells across Language Models and Image Generation. Load any spell into the builder with one click, or save your own creations here.", placement:"bottom" },
{ id:"grimoire",   target:"nav-grimoire",  title:"The Grimoire 📜", body:"This is where the courses live. Every lesson you read earns XP and moves you up the ranks. New courses are added here as they're released.", placement:"bottom" },
{ id:"playground", target:"nav-playground",title:"The Wizard's Playground 🧙", body:"Your community hub. Post wins, share prompts, message other spellcasters, and build your coven. Set your @handle in your profile to get started.", placement:"bottom" },
{ id:"profile",    target:"nav-profile",   title:"Your Profile", body:"Track your XP, rank, and progression here. Create your profile to unlock the full experience — and set your @handle so others can find you.", placement:"bottom" },
{ id:"cast",       target:"cast-btn",      title:"Cast Your Spell", body:"Once all five layers are filled, the Cast button appears. Hit it to assemble your complete prompt — then copy it straight to any AI tool.", placement:"left" },
{ id:"done",       target:null,        title:"You're ready. ✦", body:"The coven awaits. Start by filling your first section, or explore the Codex for inspiration. Your first cast earns 50 XP.", placement:"center" },
];

const dismissTutorial = () => {
setTutorialActive(false);
try { localStorage.setItem(accountKey(userEmail,"tutorial_done"),"true"); } catch {}
};
const nextStep = () => {
if(tutorialStep >= TUTORIAL_STEPS.length-1) { dismissTutorial(); return; }
setTutorialStep(s => s+1);
};
const prevStep = () => setTutorialStep(s => Math.max(0, s-1));

const getTutorialTargetRect = (targetId) => {
const el = tutorialRefs.current[targetId];
if(!el) return null;
return el.getBoundingClientRect();
};

// Tooltip position effect — runs when tutorial step changes
useEffect(()=>{
if(!tutorialActive) return;
const step = TUTORIAL_STEPS[tutorialStep];
if(!step) return;
if(!step.target) {
setSpotlightRect(null);
setTooltipPos({top:"50%",left:"50%",transform:"translate(-50%,-50%)",arrowDir:null});
return;
}
const el = tutorialRefs.current[step.target];
if(!el) {
setSpotlightRect(null);
setTooltipPos({top:"50%",left:"50%",transform:"translate(-50%,-50%)",arrowDir:null});
return;
}
const r = el.getBoundingClientRect();
const pad = 8;
setSpotlightRect({top:r.top-pad, left:r.left-pad, width:r.width+pad*2, height:r.height+pad*2, borderRadius:12});
const vw = window.innerWidth, vh = window.innerHeight;
const tooltipW = Math.min(300, vw-32), tooltipH = 180;
let pos = {};
if(step.placement==="bottom"){
pos = {top:r.bottom+18, left:Math.max(16,Math.min(r.left+r.width/2-tooltipW/2, vw-tooltipW-16)), arrowDir:"top"};
} else if(step.placement==="top"){
pos = {top:r.top-tooltipH-18, left:Math.max(16,Math.min(r.left+r.width/2-tooltipW/2, vw-tooltipW-16)), arrowDir:"bottom"};
} else if(step.placement==="left"){
pos = {top:Math.max(16,r.top+r.height/2-tooltipH/2), left:r.left-tooltipW-18, arrowDir:"right"};
} else if(step.placement==="right"){
pos = {top:Math.max(16,r.top+r.height/2-tooltipH/2), left:r.right+18, arrowDir:"left"};
} else {
pos = {top:"50%",left:"50%",transform:"translate(-50%,-50%)",arrowDir:null};
}
if(pos.top && typeof pos.top==="number") pos.top = Math.max(16, Math.min(pos.top, vh-tooltipH-16));
setTooltipPos(pos);
// eslint-disable-next-line react-hooks/exhaustive-deps
},[tutorialStep, tutorialActive]);

// ── APPEARANCE SETTINGS ──────────────────────────────────────────────────────
const loadAppearance = () => {
try { return JSON.parse(localStorage.getItem(accountKey(userEmail,"appearance")) || "null") || {theme:"dark",font:"Georgia",fontSize:"medium"}; }
catch { return {theme:"dark",font:"Georgia",fontSize:"medium"}; }
};
const [appearance, setAppearanceState] = useState(loadAppearance);
const saveAppearance = (next) => {
setAppearanceState(next);
saveAccountField(userEmail, "appearance", next);
};

// ── THEME TOKENS ─────────────────────────────────────────────────────────────
const THEMES = {
dark:  { bg:"#0a0a0f", surface:"#0d0d14", surface2:"#13131f", border:"#1e1e2a", border2:"#2a2a3a", text:"#e8e4d9", textMid:"#5a5a7a", textDim:"#3a3a5a" },
light: { bg:"#f4f2ee", surface:"#faf9f7", surface2:"#f0ede8", border:"#ddd9d0", border2:"#ccc8be", text:"#1a1814", textMid:"#6b6560", textDim:"#9a9590" },
};
const T = THEMES[appearance.theme] || THEMES.dark;

const FONTS = { "Georgia":"Georgia,serif", "Mono":"monospace", "System":"-apple-system,sans-serif" };
const FONT_SIZES = { small:13, medium:15, large:17 };
const bodyFont = FONTS[appearance.font] || FONTS.Georgia;
const bodySize = FONT_SIZES[appearance.fontSize] || 15;

const [xpToast,      setXpToast]           = useState(null);
const [savePrompt,   setSavePrompt]        = useState(false);
const [saveForm,     setSaveForm]          = useState({ title:"", description:"", category:"Language Models" });
const [levelUp,      setLevelUp]           = useState(null);
const [spellSaved,   setSpellSaved]        = useState(false);
const [activeLesson, setActiveLesson]      = useState(null);
const [activeCourse, setActiveCourse]      = useState("spellbook");
const [tooltipPos,   setTooltipPos]        = useState({top:0,left:0,arrowDir:"top"});
const [spotlightRect,setSpotlightRect]     = useState(null);
const tooltipRef = useRef(null);
const [showPaywall,  setShowPaywall]       = useState(false);
const [paywallPlan,  setPaywallPlan]       = useState("monthly"); // "course" | "monthly" | "yearly"
const [paywallCourse,setPaywallCourse]     = useState("spellbook"); // which single course is selected
const [secXP,        setSecXP]            = useState({});

// ── PLAYGROUND STATE ─────────────────────────────────────────────────────────
const [pgTab,        setPgTab]            = useState("feed");       // feed | messages | friends
const [pgCompose,    setPgCompose]        = useState(false);
const [pgDraft,      setPgDraft]          = useState({text:"",type:"win",spellAttached:null});
const [pgActiveConvo,setPgActiveConvo]    = useState(null);
const [pgMsgDraft,   setPgMsgDraft]       = useState("");
const [pgFriendInput,setPgFriendInput]    = useState("");

// ── PLAYGROUND STORAGE HELPERS ───────────────────────────────────────────────
// All keyed to "pg_*" in localStorage — ready to swap for Supabase/Firebase
const pgKey  = (k) => `sb_pg_${k}`;
const pgLoad = (k, fallback) => { try { return JSON.parse(localStorage.getItem(pgKey(k))) ?? fallback; } catch { return fallback; } };
const pgSave = (k, v) => { try { localStorage.setItem(pgKey(k), JSON.stringify(v)); } catch {} };

const [pgPosts,    setPgPostsState]    = useState(()=>pgLoad("posts",    MOCK_POSTS));
const [pgMessages, setPgMessagesState] = useState(()=>pgLoad("messages", MOCK_MESSAGES));
const [pgFriends,  setPgFriendsState]  = useState(()=>pgLoad("friends",  MOCK_FRIENDS));
const [pgRequests, setPgRequestsState] = useState(()=>pgLoad("requests", []));

const savePgPosts    = v => { setPgPostsState(v);    pgSave("posts",    v); };
const savePgMessages = v => { setPgMessagesState(v); pgSave("messages", v); };
const savePgFriends  = v => { setPgFriendsState(v);  pgSave("friends",  v); };
const savePgRequests = v => { setPgRequestsState(v); pgSave("requests", v); };

const myHandle = profile?.handle || profile?.name || userEmail?.split("@")[0] || "Apprentice";
const myAvatar = profile?.avatar || "🧙";

const spellCastId = useRef(null);

useEffect(() => {
const check = () => setIsMobile(window.innerWidth < 768);
check(); window.addEventListener("resize", check);
return () => window.removeEventListener("resize", check);
}, []);

useEffect(() => {
const k = e => { if(e.key==="Escape"){setCodexOpen(false);setProfileOpen(false);setSavePrompt(false);setShowPaywall(false);} };
window.addEventListener("keydown", k);
return () => window.removeEventListener("keydown", k);
}, []);

const awardXP = (amount, reason) => {
setXPState(prev => {
const oldRank = getRankInfo(prev);
const next = prev + amount;
const newRank = getRankInfo(next);
save("xp", next.toString());
if(newRank.current.level > oldRank.current.level){
setLevelUp({level:newRank.current.level,rank:newRank.current.rank,color:newRank.current.color});
setTimeout(()=>setLevelUp(null),3500);
}
return next;
});
setXpToast({amount,reason});
setTimeout(()=>setXpToast(null),2200);
};

const handleSectionChange = (id, val) => {
const wasEmpty = !values[id]?.trim();
const nowFilled = val.trim().length > 0;
setValues(v => ({...v,[id]:val}));
if(wasEmpty && nowFilled && !secXP[id]){
const updated = {...secXP,[id]:true};
setSecXP(updated);
awardXP(XP_REWARDS.fillSection, `+${XP_REWARDS.fillSection} XP — Section filled`);
}
};

const resetSpell = () => {
setValues({}); setActive(0); setShowFinal(false); setLoadedSpell(null);
setLoadedSpellCategory(null); setSecXP({}); setSpellSaved(false); spellCastId.current = null;
};

const loadSpell = (spell, category=null) => {
const merged={}; SECTIONS.forEach(s=>{merged[s.id]=spell[s.id]||"";});
setValues(merged); setLoadedSpell(spell); setLoadedSpellCategory(category);
setCodexOpen(false); setActive(0); setShowFinal(false); setSecXP({});
setSpellSaved(false); spellCastId.current=null; setView("builder");
};

// ── IMAGE MODE DETECTION ──────────────────────────────────────────────────────
const isImageMode  = detectImageMode(values, loadedSpellCategory);
const activeSecs   = isImageMode ? IMAGE_SECTIONS : SECTIONS;
const current      = activeSecs[Math.min(active, activeSecs.length-1)];
const filled       = activeSecs.filter(s => values[s.id]?.trim()).length;
const required     = activeSecs.filter(s => !s.optional);
const allReqFilled = required.every(s => values[s.id]?.trim());
const allFilled    = activeSecs.every(s => values[s.id]?.trim());
const progress     = (filled/activeSecs.length)*100;
const ri           = getRankInfo(xp);
// Image prompts assemble flat, no role wrapper — just the visual layers in order
const assembled    = isImageMode
? activeSecs.filter(s=>values[s.id]?.trim()).map(s=>values[s.id].trim()).join(", ")
: activeSecs.filter(s=>values[s.id]?.trim()).map(s=>values[s.id].trim()).join("\n\n");

const handleCast = () => {
if(spellCastId.current) return;
spellCastId.current = Date.now();
let bonus = XP_REWARDS.castSpell;
if(allFilled) bonus += XP_REWARDS.completeAllSections;
awardXP(bonus, `+${bonus} XP — Spell cast!`);
setShowFinal(true);
setTimeout(()=>setSavePrompt(true),600);
};

const handleSaveSpell = () => {
if(!saveForm.title.trim()) return;
const spell = {}; SECTIONS.forEach(s=>{spell[s.id]=values[s.id]||"";});
const entry = {title:saveForm.title,description:saveForm.description,category:saveForm.category,spell,savedAt:Date.now()};
const updated = [entry,...mySpells];
setMySpellsState(updated); save("myspells", updated);
awardXP(XP_REWARDS.saveToCodex,`+${XP_REWARDS.saveToCodex} XP — Saved to Codex!`);
setSavePrompt(false); setSaveForm({title:"",description:"",category:"Language Models"}); setSpellSaved(true);
};

const handleSaveProfile = () => {
if(!profileForm.name.trim()) return;
const h = profileForm.handle.trim();
const validationErr = validateHandle(h);
if(validationErr) { setHandleStatus(validationErr); return; }
// If handle changed or is new, check availability
if(h.toLowerCase() !== profile?.handle?.toLowerCase()) {
if(isHandleTaken(h)) { setHandleStatus("taken"); return; }
}
reserveHandle(h, userEmail);
const p = {...profileForm, handle:h, createdAt:profile?.createdAt||Date.now()};
setProfileState(p); save("profile", p);
if(!profile) awardXP(XP_REWARDS.createProfile,`+${XP_REWARDS.createProfile} XP — Profile created!`);
setProfileEdit(false);
setHandleStatus(null);
};

const openLesson = lesson => {
if(lesson.tier==="paid"&&!hasAccess(lesson.course)){setShowPaywall(true);return;}
setActiveLesson(lesson); setView("lesson");
if(!lessonsRead.includes(lesson.id)){
const updated=[...lessonsRead,lesson.id];
setLessonsRead(updated); save("lessons_read",updated);
awardXP(XP_REWARDS.readLesson,`+${XP_REWARDS.readLesson} XP — Lesson read`);
}
};

const activatePro = () => {
setIsPro(true); save("pro","true");
setShowPaywall(false);
awardXP(50,"+50 XP — Grimoire unlocked! ✦");
};
const activateCourse = (courseId) => {
const next = new Set([...unlockedCourses, courseId]);
saveUnlocked(next);
setShowPaywall(false);
awardXP(50,"+50 XP — Course unlocked! ✦");
};

const AVATARS = ["🧙","🔮","⚗️","📜","🌙","⭐","🌀","🗝️","🕯️","🦉"];
const btn  = (ex={}) => ({background:"linear-gradient(135deg,#7b6cf6,#c084fc)",border:"none",borderRadius:8,padding:"10px 22px",color:"#fff",fontSize:12,cursor:"pointer",letterSpacing:2,fontFamily:"monospace",...ex});
const ghost= (ex={}) => ({background:"#1a1a24",border:"1px solid #2a2a3a",borderRadius:8,padding:"10px 18px",color:"#6a6a8a",fontSize:12,cursor:"pointer",letterSpacing:2,fontFamily:"monospace",...ex});

// ── OVERLAYS ────────────────────────────────────────────────────────────────
const XPToast = () => xpToast ? (
<div style={{position:"fixed",bottom:80,right:24,background:"#0f1f0f",border:"1px solid #2a5a2a",borderRadius:10,padding:"10px 20px",color:"#4ade80",fontSize:12,letterSpacing:2,fontFamily:"monospace",zIndex:200,boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
<style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
✦ {xpToast.reason}
</div>
) : null;

const LevelUpOverlay = () => levelUp ? (
<div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,pointerEvents:"none"}}>
<div style={{background:"#0a0a14",border:`2px solid ${levelUp.color}`,borderRadius:20,padding:"40px 60px",textAlign:"center",boxShadow:`0 0 60px ${levelUp.color}44`}}>
<style>{`@keyframes levelPop{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}`}</style>
<div style={{fontSize:48,marginBottom:12}}>{RANK_SYMBOLS[levelUp.rank]||"✦"}</div>
<div style={{fontSize:11,color:levelUp.color,letterSpacing:4,fontFamily:"monospace",marginBottom:8}}>LEVEL UP</div>
<div style={{fontSize:32,color:"#e8e4d9",letterSpacing:"-0.5px",marginBottom:4}}>Level {levelUp.level}</div>
<div style={{fontSize:18,color:levelUp.color}}>{levelUp.rank}</div>
</div>
</div>
) : null;

const PAYWALL_COURSES = [
{ id:"spellbook", label:"The AI Spellbook",       icon:"✦",  price:"$4.99", color:"#a78bfa" },
{ id:"byb",       label:"Bottle Your Brilliance", icon:"🖋",  price:"$6.99", color:"#34d399" },
{ id:"prompting", label:"Prompting Mastery",      icon:"⚡",  price:"$4.99", color:"#fbbf24" },
{ id:"demystify", label:"Demystify AI",            icon:"🌐",  price:"$3.99", color:"#60a5fa" },
].map(c => ({ ...c, lessons: GRIMOIRE.filter(l => l.course === c.id).length }));

const PaywallModal = () => {
if(!showPaywall) return null;
const selectedCourse = PAYWALL_COURSES.find(c=>c.id===paywallCourse);
const alreadyUnlocked = hasAccess(paywallCourse);
return (
<>
<div onClick={()=>setShowPaywall(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:90,backdropFilter:"blur(4px)"}}/>
<div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#0d0d14",border:"1px solid #3a2a6a",borderRadius:20,padding:isMobile?"24px 20px":"36px 40px",width:isMobile?"calc(100vw - 24px)":"min(540px, calc(100vw - 32px))",zIndex:100,boxShadow:"0 20px 80px rgba(100,50,200,0.3)",maxHeight:"90vh",overflowY:"auto"}}>

    {/* ── HEADER ── */}
    <div style={{textAlign:"center",marginBottom:28}}>
      <div style={{fontSize:40,marginBottom:10}}>📜</div>
      <div style={{fontSize:10,letterSpacing:4,color:"#a78bfa",fontFamily:"monospace",marginBottom:6}}>RESTRICTED KNOWLEDGE</div>
      <div style={{fontSize:22,color:"#e8e4d9",letterSpacing:"-0.5px",marginBottom:8}}>Unlock the Grimoire</div>
      <div style={{fontSize:13,color:"#5a5a7a",lineHeight:1.7}}>
        One course. All courses. Or everything for a full year.<br/>
        Every path includes <span style={{color:"#4ade80"}}>bonus XP on unlock.</span>
      </div>
    </div>

    {/* ── PLAN TOGGLE ── */}
    <div style={{display:"flex",background:"#13131f",borderRadius:10,padding:3,marginBottom:24,gap:2,position:"relative"}}>
      {[{id:"course",label:"Per Course"},{id:"monthly",label:"Monthly"},{id:"yearly",label:"Yearly"}].map(p=>(
        <button key={p.id} onClick={()=>setPaywallPlan(p.id)} style={{flex:1,background:paywallPlan===p.id?"#1e1e2e":"transparent",border:"none",borderRadius:8,padding:"10px 4px",color:paywallPlan===p.id?"#e8e4d9":"#4a4a6a",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,transition:"all 0.2s",position:"relative"}}>
          {p.label}
          {p.id==="yearly"&&<span style={{position:"absolute",top:-9,right:0,background:"#4ade80",color:"#0a1a10",fontSize:7,fontFamily:"monospace",letterSpacing:1,borderRadius:4,padding:"2px 5px",fontWeight:"bold",whiteSpace:"nowrap"}}>SAVE 30%</span>}
        </button>
      ))}
    </div>

    {/* ════════════════════════════════ PER COURSE ════════════════════════════════ */}
    {paywallPlan==="course"&&(
      <div>
        <div style={{fontSize:10,color:"#5a5a7a",letterSpacing:2,fontFamily:"monospace",marginBottom:12}}>SELECT A COURSE</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {PAYWALL_COURSES.map(c=>{
            const owned = hasAccess(c.id);
            const isSelected = paywallCourse===c.id;
            return(
              <div key={c.id} onClick={()=>!owned&&setPaywallCourse(c.id)} style={{display:"flex",alignItems:"center",gap:12,background:isSelected?"#1a1030":"#13131f",border:`1px solid ${isSelected?c.color+"66":owned?"#2a3a2a":"#2a2a3a"}`,borderRadius:12,padding:"14px 16px",cursor:owned?"default":"pointer",transition:"all 0.15s",opacity:owned?0.7:1}}>
                <span style={{fontSize:20}}>{owned?"✓":c.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,color:"#e8e4d9"}}>{c.label}</span>
                    {owned&&<span style={{fontSize:8,color:"#4ade80",letterSpacing:2,fontFamily:"monospace",background:"#0a1a10",border:"1px solid #1a4a28",borderRadius:4,padding:"2px 6px"}}>OWNED</span>}
                  </div>
                  <div style={{fontSize:10,color:"#5a5a7a",fontFamily:"monospace",marginTop:2}}>{c.lessons} LESSONS · LIFETIME ACCESS</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {owned
                    ? <span style={{fontSize:11,color:"#4ade80",fontFamily:"monospace"}}>Unlocked</span>
                    : <><div style={{fontSize:16,color:c.color,fontFamily:"monospace",fontWeight:"bold"}}>{c.price}</div>
                      <div style={{fontSize:9,color:"#3a3a5a",fontFamily:"monospace"}}>ONE-TIME</div></>
                  }
                </div>
                {!owned&&<div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${isSelected?c.color:"#3a3a5a"}`,background:isSelected?c.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {isSelected&&<span style={{fontSize:9,color:"#0a0a0f"}}>✓</span>}
                </div>}
              </div>
            );
          })}
        </div>
        <div style={{background:"#13131f",border:"1px solid #2a2a3a",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:11,color:"#5a5a7a",lineHeight:1.7}}>
          ✦ Own each course forever. Switch to Monthly or Yearly if you want everything at once.
        </div>
        {alreadyUnlocked
          ? <div style={{background:"#0a1a10",border:"1px solid #1a4a28",borderRadius:10,padding:"14px",textAlign:"center",marginBottom:4}}>
              <span style={{fontSize:13,color:"#4ade80",fontFamily:"monospace",letterSpacing:1}}>✓ You already own {selectedCourse?.label}</span>
            </div>
          : <button onClick={()=>activateCourse(paywallCourse)} style={btn({width:"100%",padding:"15px",fontSize:13,letterSpacing:2})}>
              UNLOCK {selectedCourse?.label} — {selectedCourse?.price} ✦
            </button>
        }
      </div>
    )}

    {/* ════════════════════════════════ MONTHLY ════════════════════════════════ */}
    {paywallPlan==="monthly"&&(
      <div>
        {/* Price card */}
        <div style={{background:"linear-gradient(135deg,#1a103a,#13131f)",border:"1px solid #3a2a6a",borderRadius:16,padding:"28px 24px",marginBottom:16,textAlign:"center",position:"relative"}}>
          <div style={{fontSize:44,color:"#a78bfa",fontFamily:"monospace",lineHeight:1,marginBottom:6}}>
            $9.99<span style={{fontSize:16,color:"#5a5a7a",fontWeight:"normal"}}>/mo</span>
          </div>
          <div style={{fontSize:11,color:"#6a6a9a",fontFamily:"monospace",letterSpacing:2}}>ALL FOUR COURSES · CANCEL ANYTIME</div>
          <div style={{marginTop:12,padding:"6px 14px",background:"#a78bfa22",border:"1px solid #a78bfa44",borderRadius:20,display:"inline-block",fontSize:10,color:"#a78bfa",letterSpacing:1,fontFamily:"monospace"}}>BILLED MONTHLY</div>
        </div>
        {/* Benefits */}
        <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:20}}>
          {[
            {icon:"📚",text:`All ${PAYWALL_COURSES.length} courses — ${GRIMOIRE.filter(l=>l.tier==="paid").length + GRIMOIRE.filter(l=>l.tier==="free").length} lessons total`},
            {icon:"🆕",text:"New courses added automatically"},
            {icon:"🔓",text:"Cancel any time — no lock-in"},
            {icon:"⚡",text:"XP progression + community access"},
            {icon:"✦",text:"+50 bonus XP on first unlock"},
          ].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:14,flexShrink:0}}>{f.icon}</span>
              <span style={{fontSize:13,color:"#9a9ab8"}}>{f.text}</span>
            </div>
          ))}
        </div>
        <button onClick={activatePro} style={btn({width:"100%",padding:"15px",fontSize:13,letterSpacing:2})}>
          START MONTHLY — $9.99/mo ✦
        </button>
        <div style={{marginTop:10,textAlign:"center",fontSize:11,color:"#4a4a6a",fontFamily:"monospace"}}>
          Save 30% by switching to yearly →{" "}
          <button onClick={()=>setPaywallPlan("yearly")} style={{background:"none",border:"none",color:"#a78bfa",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,padding:0}}>SEE YEARLY</button>
        </div>
      </div>
    )}

    {/* ════════════════════════════════ YEARLY ════════════════════════════════ */}
    {paywallPlan==="yearly"&&(
      <div>
        {/* Price card */}
        <div style={{background:"linear-gradient(135deg,#0a1a0f,#0d1a14,#13131f)",border:"2px solid #2a5a2a",borderRadius:16,padding:"28px 24px",marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden"}}>
          {/* Best value badge */}
          <div style={{position:"absolute",top:0,right:0,background:"linear-gradient(135deg,#16a34a,#4ade80)",color:"#0a1a10",fontSize:9,fontFamily:"monospace",letterSpacing:2,padding:"6px 16px",fontWeight:"bold",borderRadius:"0 16px 0 12px"}}>BEST VALUE</div>
          {/* Crossed out monthly rate */}
          <div style={{fontSize:13,color:"#3a4a3a",fontFamily:"monospace",letterSpacing:1,textDecoration:"line-through",marginBottom:4}}>$119.88/yr at monthly rate</div>
          {/* Annual price */}
          <div style={{fontSize:44,color:"#4ade80",fontFamily:"monospace",lineHeight:1,marginBottom:4}}>
            $83.88<span style={{fontSize:16,color:"#5a5a7a",fontWeight:"normal"}}>/yr</span>
          </div>
          {/* Savings callout */}
          <div style={{fontSize:14,color:"#4ade80",letterSpacing:1,fontFamily:"monospace",marginBottom:6}}>SAVE $36 · 30% OFF</div>
          <div style={{fontSize:11,color:"#5a5a7a"}}>just $6.99/month, billed once a year</div>
          {/* Equivalent savings pill */}
          <div style={{marginTop:12,padding:"6px 16px",background:"#4ade8022",border:"1px solid #4ade8044",borderRadius:20,display:"inline-block",fontSize:10,color:"#4ade80",letterSpacing:1,fontFamily:"monospace"}}>= 3 MONTHS FREE</div>
        </div>
        {/* Benefits */}
        <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:20}}>
          {[
            {icon:"📚",text:`Everything in Monthly — all ${PAYWALL_COURSES.length} courses`},
            {icon:"💰",text:"30% cheaper than month-by-month"},
            {icon:"🏅",text:"Annual Spellcaster badge on your profile"},
            {icon:"🚀",text:"Priority access to new courses first"},
            {icon:"✦",text:"+50 bonus XP on unlock"},
          ].map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:14,flexShrink:0}}>{f.icon}</span>
              <span style={{fontSize:13,color:"#9a9ab8"}}>{f.text}</span>
            </div>
          ))}
        </div>
        {/* Comparison bar */}
        <div style={{background:"#13131f",border:"1px solid #2a2a3a",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{textAlign:"center",flex:1}}>
            <div style={{fontSize:11,color:"#5a5a7a",fontFamily:"monospace",marginBottom:2}}>MONTHLY</div>
            <div style={{fontSize:14,color:"#9a9ab8",fontFamily:"monospace"}}>$9.99/mo</div>
          </div>
          <div style={{width:1,height:32,background:"#2a2a3a"}}/>
          <div style={{textAlign:"center",flex:1}}>
            <div style={{fontSize:11,color:"#4ade80",fontFamily:"monospace",marginBottom:2}}>YEARLY</div>
            <div style={{fontSize:14,color:"#4ade80",fontFamily:"monospace",fontWeight:"bold"}}>$6.99/mo</div>
          </div>
          <div style={{width:1,height:32,background:"#2a2a3a"}}/>
          <div style={{textAlign:"center",flex:1}}>
            <div style={{fontSize:11,color:"#5a5a7a",fontFamily:"monospace",marginBottom:2}}>YOU SAVE</div>
            <div style={{fontSize:14,color:"#4ade80",fontFamily:"monospace",fontWeight:"bold"}}>$36/yr</div>
          </div>
        </div>
        <button onClick={activatePro} style={{...btn({width:"100%",padding:"15px",fontSize:13,letterSpacing:2}),background:"linear-gradient(135deg,#16a34a,#4ade80)",color:"#0a1a10",fontWeight:"bold"}}>
          UNLOCK YEARLY — $83.88 ✦
        </button>
      </div>
    )}

    {/* ── FOOTER ── */}
    <div style={{marginTop:20,textAlign:"center"}}>
      <button onClick={()=>setShowPaywall(false)} style={{background:"none",border:"none",color:"#3a3a5a",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>NOT YET</button>
      <div style={{fontSize:10,color:"#2a2a3a",fontFamily:"monospace"}}>* Demo mode — click any button to simulate unlock</div>
    </div>

  </div>
</>

);
};

const SavePromptModal = () => savePrompt ? (
<>
<div onClick={()=>setSavePrompt(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:90,backdropFilter:"blur(3px)"}}/>
<div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#0d0d14",border:"1px solid #2a2a3a",borderRadius:16,padding:"32px",width:isMobile?"calc(100vw - 40px)":440,zIndex:100,boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
<div style={{fontSize:10,color:"#a78bfa",letterSpacing:4,fontFamily:"monospace",marginBottom:6}}>◈ SAVE TO CODEX</div>
<div style={{fontSize:22,color:"#e8e4d9",marginBottom:6,letterSpacing:"-0.5px"}}>Add this spell to your library?</div>
<div style={{fontSize:13,color:"#5a5a7a",marginBottom:24,lineHeight:1.6}}>Save it and earn <span style={{color:"#4ade80"}}>+{XP_REWARDS.saveToCodex} XP</span>.</div>
<input value={saveForm.title} onChange={e=>setSaveForm(f=>({...f,title:e.target.value}))} placeholder="Spell name..." style={{width:"100%",background:"#13131f",border:"1px solid #2a2a3a",borderRadius:8,padding:"12px 14px",color:"#e8e4d9",fontSize:14,fontFamily:"Georgia,serif",outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
<input value={saveForm.description} onChange={e=>setSaveForm(f=>({...f,description:e.target.value}))} placeholder="Short description (optional)..." style={{width:"100%",background:"#13131f",border:"1px solid #2a2a3a",borderRadius:8,padding:"12px 14px",color:"#e8e4d9",fontSize:14,fontFamily:"Georgia,serif",outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
<select value={saveForm.category} onChange={e=>setSaveForm(f=>({...f,category:e.target.value}))} style={{width:"100%",background:"#13131f",border:"1px solid #2a2a3a",borderRadius:8,padding:"12px 14px",color:"#e8e4d9",fontSize:13,fontFamily:"monospace",outline:"none",marginBottom:20,boxSizing:"border-box"}}>
{Object.keys(DEFAULT_CODEX).map(c=><option key={c} value={c}>{c}</option>)}
</select>
<div style={{display:"flex",gap:10}}>
<button onClick={handleSaveSpell} style={btn({flex:1})}>SAVE SPELL ✦</button>
<button onClick={()=>setSavePrompt(false)} style={ghost()}>SKIP</button>
</div>
</div>
</>
) : null;

// ── HEADER ──────────────────────────────────────────────────────────────────
const Header = () => isMobile ? (
// ── MOBILE HEADER: two rows ──────────────────────────────────────────────
<div style={{borderBottom:"1px solid #1e1e2a",background:"#0d0d14",flexShrink:0}}>
{/* Row 1: logo + nav tabs */}
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 8px"}}>
<div style={{cursor:"pointer"}} onClick={()=>{setView("builder");setShowFinal(false);}}>
<div style={{fontSize:8,letterSpacing:3,color:"#3a3a5a",fontFamily:"monospace",marginBottom:1}}>WORDS ARE SPELLS</div>
<div style={{fontSize:15,color:"#e8e4d9",fontStyle:"italic"}}>✦ Wizards Playground</div>
</div>
<div style={{display:"flex",gap:3,background:"#13131f",borderRadius:8,padding:3}}>
<button ref={el=>tutorialRefs.current["nav-builder"]=el} onClick={()=>{setView("builder");setShowFinal(false);}} style={{background:view==="builder"?"#0a0a14":"transparent",border:"none",borderRadius:6,padding:"7px 12px",color:view==="builder"?"#e8e4d9":"#4a4a6a",fontSize:9,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}}>BUILDER</button>
<button ref={el=>tutorialRefs.current["nav-grimoire"]=el} onClick={()=>setView("grimoire")} style={{background:(view==="grimoire"||view==="lesson")?"#0a0a14":"transparent",border:"none",borderRadius:6,padding:"7px 12px",color:(view==="grimoire"||view==="lesson")?"#e8e4d9":"#4a4a6a",fontSize:9,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",display:"flex",alignItems:"center",gap:3}}>
{!isPro&&<span style={{fontSize:8,color:"#fbbf24"}}>🔒</span>}GRIMOIRE
</button>
<button ref={el=>tutorialRefs.current["nav-playground"]=el} onClick={()=>setView("playground")} style={{background:view==="playground"?"#0a0a14":"transparent",border:"none",borderRadius:6,padding:"7px 12px",color:view==="playground"?"#fbbf24":"#4a4a6a",fontSize:9,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}}>🧙</button>
</div>
</div>
{/* Row 2: profile, codex, progress, cast, sign out */}
<div style={{display:"flex",alignItems:"center",gap:7,padding:"0 14px 10px"}}>
<button ref={el=>tutorialRefs.current["nav-profile"]=el} onClick={()=>setProfileOpen(true)} style={{background:"#13131f",border:`1px solid ${ri.current.color}33`,borderRadius:8,padding:"7px 10px",color:ri.current.color,fontSize:9,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
<span style={{fontSize:14}}>{profile?.avatar||"🧙"}</span>
<span>LVL {ri.current.level}</span>
</button>
<button ref={el=>tutorialRefs.current["nav-codex"]=el} onClick={()=>{setCodexOpen(true);setCodexCat("My Spells");}} style={{background:"#16102a",border:"1px solid #3a2a6a",borderRadius:8,padding:"7px 10px",color:"#a78bfa",fontSize:9,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",flexShrink:0}}>◈ CODEX</button>
<div style={{flex:1,textAlign:"center"}}>
<div style={{fontSize:9,color:"#3a3a5a",letterSpacing:2,fontFamily:"monospace",marginBottom:3}}>{filled}/{SECTIONS.length}</div>
<div style={{height:2,background:"#1e1e2a",borderRadius:2}}>
<div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#7b6cf6,#c084fc)",borderRadius:2,transition:"width 0.4s"}}/>
</div>
</div>
{(allReqFilled||showFinal)&&view==="builder"&&(
<button onClick={()=>showFinal?setShowFinal(false):handleCast()} style={btn({fontSize:9,padding:"7px 10px",flexShrink:0})}>
{showFinal?"← BACK":"CAST →"}
</button>
)}
<button onClick={()=>{if(window.confirm("Sign out?"))onLogout();}} style={{background:"#13131f",border:"1px solid #1e1e2a",borderRadius:8,padding:"7px 9px",color:"#3a3a5a",fontSize:9,cursor:"pointer",fontFamily:"monospace",flexShrink:0}} title="Sign out">⇤</button>
</div>
</div>
) : (
// ── DESKTOP HEADER ───────────────────────────────────────────────────────
<div style={{borderBottom:"1px solid #1e1e2a",padding:"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0d0d14",flexShrink:0,gap:12}}>
<div style={{flexShrink:0,cursor:"pointer"}} onClick={()=>{setView("builder");setShowFinal(false);}}>
<div style={{fontSize:9,letterSpacing:3,color:"#3a3a5a",fontFamily:"monospace",marginBottom:1}}>WORDS ARE SPELLS</div>
<div style={{fontSize:20,color:"#e8e4d9",letterSpacing:"-0.5px",fontStyle:"italic"}}>✦ Wizards Playground</div>
</div>
<div style={{display:"flex",alignItems:"center",gap:8}}>
<div style={{display:"flex",gap:3,background:"#13131f",borderRadius:8,padding:4}}>
<button ref={el=>tutorialRefs.current["nav-builder"]=el} onClick={()=>{setView("builder");setShowFinal(false);}} style={{background:view==="builder"?"#0a0a14":"transparent",border:"none",borderRadius:6,padding:"7px 13px",color:view==="builder"?"#e8e4d9":"#4a4a6a",fontSize:11,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}}>BUILDER</button>
<button ref={el=>tutorialRefs.current["nav-grimoire"]=el} onClick={()=>setView("grimoire")} style={{background:(view==="grimoire"||view==="lesson")?"#0a0a14":"transparent",border:"none",borderRadius:6,padding:"7px 13px",color:(view==="grimoire"||view==="lesson")?"#e8e4d9":"#4a4a6a",fontSize:11,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",display:"flex",alignItems:"center",gap:4}}>
{!isPro&&<span style={{fontSize:8,color:"#fbbf24"}}>🔒</span>}GRIMOIRE
</button>
<button ref={el=>tutorialRefs.current["nav-playground"]=el} onClick={()=>setView("playground")} style={{background:view==="playground"?"#0a0a14":"transparent",border:"none",borderRadius:6,padding:"7px 13px",color:view==="playground"?"#fbbf24":"#4a4a6a",fontSize:11,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",display:"flex",alignItems:"center",gap:4}}>🧙 PLAYGROUND</button>
</div>
<div style={{display:"flex",alignItems:"center",gap:8,background:"#13131f",border:`1px solid ${ri.current.color}33`,borderRadius:8,padding:"7px 12px",cursor:"pointer"}} onClick={()=>setProfileOpen(true)}>
<span style={{fontSize:14}}>{profile?.avatar||"🧙"}</span>
<div>
<div style={{fontSize:9,color:ri.current.color,letterSpacing:2,fontFamily:"monospace"}}>{ri.current.rank} · LVL {ri.current.level}</div>
<div style={{width:70,height:2,background:"#1e1e2a",borderRadius:2,marginTop:4}}>
<div style={{width:`${ri.pct}%`,height:"100%",background:ri.current.color,borderRadius:2,transition:"width 0.5s"}}/>
</div>
</div>
</div>
<button ref={el=>tutorialRefs.current["nav-profile"]=el} onClick={()=>setProfileOpen(true)} style={{background:"#13131f",border:`1px solid ${ri.current.color}33`,borderRadius:8,padding:"8px 12px",color:ri.current.color,fontSize:10,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}}>{RANK_SYMBOLS[ri.current.rank]} PROFILE</button>
<button ref={el=>tutorialRefs.current["nav-codex"]=el} onClick={()=>{setCodexOpen(true);setCodexCat("My Spells");}} style={{background:"#16102a",border:"1px solid #3a2a6a",borderRadius:8,padding:"8px 14px",color:"#a78bfa",fontSize:10,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}}>◈ CODEX</button>
<div style={{textAlign:"right"}}>
<div style={{fontSize:9,color:"#3a3a5a",letterSpacing:2,fontFamily:"monospace"}}>{filled}/{SECTIONS.length}</div>
<div style={{marginTop:4,width:70,height:2,background:"#1e1e2a",borderRadius:2}}>
<div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#7b6cf6,#c084fc)",borderRadius:2,transition:"width 0.4s"}}/>
</div>
</div>
{(allReqFilled||showFinal)&&view==="builder"&&(
<button ref={el=>tutorialRefs.current["cast-btn"]=el} onClick={()=>showFinal?setShowFinal(false):handleCast()} style={btn({background:showFinal?"#1e1e2a":undefined,border:showFinal?"1px solid #2a2a3a":"none",fontSize:11,padding:"9px 16px"})}>
{showFinal?"← BACK":"CAST →"}
</button>
)}
<button onClick={()=>{if(window.confirm("Sign out of your account?"))onLogout();}} style={{background:"#13131f",border:"1px solid #1e1e2a",borderRadius:8,padding:"7px 12px",color:"#3a3a5a",fontSize:10,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}} title="Sign out">SIGN OUT</button>
</div>
</div>
);

// ── PLAYGROUND VIEW ───────────────────────────────────────────────────────────
const PlaygroundView = () => {
const th = T;
const PG_TABS = [{id:"feed",label:"Feed",icon:"✦"},{id:"messages",label:"Messages",icon:"✉"},{id:"friends",label:"Spellcasters",icon:"⚔"}];
const POST_TYPES = [{val:"win",label:"🏆 Win",color:"#4ade80"},{val:"prompt",label:"⚗️ Prompt",color:"#a78bfa"},{val:"journey",label:"🗺 Journey",color:"#60a5fa"}];

const timeAgo = ts => {
  const d = Date.now()-ts, m=60000, h=3600000, dy=86400000;
  if(d<m) return "just now";
  if(d<h) return `${Math.floor(d/m)}m ago`;
  if(d<dy) return `${Math.floor(d/h)}h ago`;
  return `${Math.floor(d/dy)}d ago`;
};

// ── Post a new entry ─────────────────────────────────────────────────────
const submitPost = () => {
  if(!pgDraft.text.trim()) return;
  const newPost = {
    id: "p"+Date.now(),
    authorHandle: myHandle,
    authorAvatar: myAvatar,
    authorRank: ri.current.rank,
    type: pgDraft.type,
    text: pgDraft.text,
    spell: pgDraft.spellAttached,
    likes: 0,
    comments: [],
    createdAt: Date.now(),
  };
  savePgPosts([newPost, ...pgPosts]);
  setPgDraft({text:"",type:"win",spellAttached:null});
  setPgCompose(false);
  awardXP(20, "post to Playground");
};

// ── Like a post ──────────────────────────────────────────────────────────
const likePost = (id) => {
  savePgPosts(pgPosts.map(p=>p.id===id?{...p,likes:p.likes+1,likedByMe:true}:p));
};

// ── Send message ─────────────────────────────────────────────────────────
const sendMessage = () => {
  if(!pgMsgDraft.trim()||!pgActiveConvo) return;
  const msg = {id:"m"+Date.now(), from:"me", text:pgMsgDraft, ts:Date.now()};
  const updated = {...pgMessages, [pgActiveConvo]:[...(pgMessages[pgActiveConvo]||[]), msg]};
  savePgMessages(updated);
  setPgMsgDraft("");
};

// ── Send friend request ──────────────────────────────────────────────────
const sendFriendRequest = () => {
  const h = pgFriendInput.trim();
  if(!h) return;
  if(h.toLowerCase()===profile?.handle?.toLowerCase()) return; // can't add yourself
  if(pgFriends.includes(h)||pgRequests.includes(h)) return;
  // In demo mode, check local registry. Backend: API lookup by handle.
  if(!getEmailByHandle(h)) return; // handle doesn't exist
  savePgRequests([...pgRequests, h]);
  setPgFriendInput("");
};
const acceptRequest = (h) => {
  savePgFriends([...pgFriends, h]);
  savePgRequests(pgRequests.filter(r=>r!==h));
  const updated = {...pgMessages, [h]:[...(pgMessages[h]||[]), {id:"m"+Date.now(), from:h, text:"We're now connected, fellow spellcaster ✦", ts:Date.now()}]};
  savePgMessages(updated);
};

const typeInfo = (t) => POST_TYPES.find(p=>p.val===t)||POST_TYPES[0];

// ── FEED ─────────────────────────────────────────────────────────────────
const FeedPane = () => (
  <div style={{maxWidth:640,margin:"0 auto",width:"100%"}}>

    {/* No handle nudge */}
    {!profile?.handle&&(
      <div style={{display:"flex",alignItems:"center",gap:12,background:th.surface,border:"1px solid #fbbf2444",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
        <span style={{fontSize:18}}>⚠️</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:th.text,marginBottom:2}}>Set your handle to join the coven.</div>
          <div style={{fontSize:11,color:th.textMid}}>You need a @handle before you can post or connect with other spellcasters.</div>
        </div>
        <button onClick={()=>{setProfileOpen(true);setProfileTab("profile");setProfileEdit(true);setHandleStatus(null);setProfileForm({name:profile?.name||"",title:profile?.title||"",avatar:profile?.avatar||"",handle:""}); }} style={btn({fontSize:10,padding:"8px 14px",flexShrink:0})}>SET HANDLE</button>
      </div>
    )}

    {/* Compose button / card */}
    {!pgCompose ? (
      <div onClick={()=>setPgCompose(true)} style={{display:"flex",alignItems:"center",gap:12,background:th.surface,border:`1px solid ${th.border2}`,borderRadius:14,padding:"14px 18px",cursor:"pointer",marginBottom:20,transition:"border-color 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor="#a78bfa55"}
        onMouseLeave={e=>e.currentTarget.style.borderColor=th.border2}>
        <div style={{width:36,height:36,fontSize:20,background:th.surface2,borderRadius:10,border:`1px solid ${th.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{myAvatar}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:th.textMid,fontStyle:"italic"}}>Share a win, a prompt, or your journey...</div>
          {profile?.handle&&<div style={{fontSize:10,color:"#a78bfa",fontFamily:"monospace",marginTop:2}}>@{profile.handle}</div>}
        </div>
        <div style={{marginLeft:"auto",fontSize:18,color:"#a78bfa"}}>+</div>
      </div>
    ) : (
      <div style={{background:th.surface,border:"1px solid #a78bfa55",borderRadius:14,padding:"18px",marginBottom:20}}>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {POST_TYPES.map(t=>(
            <button key={t.val} onClick={()=>setPgDraft(d=>({...d,type:t.val}))}
              style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${pgDraft.type===t.val?t.color+"88":th.border}`,background:pgDraft.type===t.val?t.color+"22":th.surface2,color:pgDraft.type===t.val?t.color:th.textMid,fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
              {t.label}
            </button>
          ))}
        </div>
        <textarea value={pgDraft.text} onChange={e=>setPgDraft(d=>({...d,text:e.target.value}))}
          placeholder={pgDraft.type==="win"?"Share your win with the coven...":pgDraft.type==="prompt"?"Share a prompt that's been working for you...":"Share your journey..."}
          style={{width:"100%",minHeight:100,background:th.surface2,border:`1px solid ${th.border}`,borderRadius:10,padding:"12px",color:th.text,fontSize:13,fontFamily:bodyFont,lineHeight:1.6,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
        {/* Attach current spell */}
        {Object.values(values).some(v=>v?.trim()) && (
          <div style={{marginTop:10}}>
            {pgDraft.spellAttached ? (
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#1a102a",border:"1px solid #a78bfa44",borderRadius:8}}>
                <span style={{fontSize:11,color:"#a78bfa",fontFamily:"monospace",flex:1}}>✦ Spell attached</span>
                <button onClick={()=>setPgDraft(d=>({...d,spellAttached:null}))} style={{background:"none",border:"none",color:th.textDim,cursor:"pointer",fontSize:13}}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setPgDraft(d=>({...d,spellAttached:{...values}}))}
                style={{fontSize:11,color:"#a78bfa",background:"none",border:"1px dashed #a78bfa55",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
                ⚗️ ATTACH CURRENT SPELL
              </button>
            )}
          </div>
        )}
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button onClick={submitPost} style={btn({flex:1})}>POST TO PLAYGROUND ✦</button>
          <button onClick={()=>{setPgCompose(false);setPgDraft({text:"",type:"win",spellAttached:null});}} style={ghost()}>CANCEL</button>
        </div>
      </div>
    )}

    {/* Posts */}
    {pgPosts.map(post=>(
      <div key={post.id} style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14,transition:"border-color 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=th.border2}
        onMouseLeave={e=>e.currentTarget.style.borderColor=th.border}>
        {/* Post header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:38,height:38,fontSize:20,background:th.surface2,borderRadius:10,border:`1px solid ${th.border2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{post.authorAvatar}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,color:th.text}}>{post.authorHandle}</span>
              <span style={{fontSize:9,color:"#a78bfa",fontFamily:"monospace",letterSpacing:1,border:"1px solid #a78bfa33",borderRadius:4,padding:"1px 6px"}}>{post.authorRank?.toUpperCase()}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:1}}>
              {post.authorHandle&&<span style={{fontSize:10,color:th.textDim,fontFamily:"monospace"}}>@{post.authorHandle}</span>}
              <span style={{fontSize:10,color:typeInfo(post.type).color,fontFamily:"monospace"}}>{typeInfo(post.type).label}</span>
              <span style={{fontSize:10,color:th.textDim,fontFamily:"monospace"}}>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
          {pgFriends.includes(post.authorHandle)&&<span style={{fontSize:10,color:"#fbbf24",fontFamily:"monospace"}}>✦ FRIEND</span>}
        </div>

        {/* Post body */}
        <div style={{fontSize:13,color:th.text,lineHeight:1.7,marginBottom:12}}>{post.text}</div>

        {/* Attached spell */}
        {post.spell&&(
          <div style={{background:th.surface2,border:"1px solid #a78bfa33",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{fontSize:9,color:"#a78bfa",letterSpacing:2,fontFamily:"monospace",marginBottom:8}}>⚗️ ATTACHED SPELL</div>
            {Object.entries(post.spell).filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{marginBottom:6}}>
                <span style={{fontSize:9,color:th.textDim,fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}>{k}: </span>
                <span style={{fontSize:12,color:th.textMid}}>{v}</span>
              </div>
            ))}
            <button onClick={()=>{
              Object.entries(post.spell).forEach(([k,v])=>setValues(prev=>({...prev,[k]:v})));
              setView("builder"); setShowFinal(false);
            }} style={{marginTop:8,fontSize:10,color:"#a78bfa",background:"none",border:"1px solid #a78bfa44",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
              LOAD INTO BUILDER →
            </button>
          </div>
        )}

        {/* Actions */}
        <div style={{display:"flex",alignItems:"center",gap:16,paddingTop:10,borderTop:`1px solid ${th.border}`}}>
          <button onClick={()=>likePost(post.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:post.likedByMe?"#f472b6":th.textMid,fontSize:12,padding:0,transition:"color 0.15s"}}>
            <span style={{fontSize:15}}>{post.likedByMe?"♥":"♡"}</span>{post.likes}
          </button>
          {post.authorHandle!==myHandle&&(
            <button onClick={()=>{
              if(!pgFriends.includes(post.authorHandle)&&!pgRequests.includes(post.authorHandle)){
                savePgRequests([...pgRequests, post.authorHandle]);
              }
              setPgActiveConvo(post.authorHandle); setPgTab("messages");
            }} style={{background:"none",border:"none",cursor:"pointer",color:th.textMid,fontSize:12,padding:0,display:"flex",alignItems:"center",gap:5}}>
              <span>✉</span> Message
            </button>
          )}
          {post.authorHandle!==myHandle&&!pgFriends.includes(post.authorHandle)&&(
            <button onClick={()=>{if(!pgRequests.includes(post.authorHandle))savePgRequests([...pgRequests,post.authorHandle]);}}
              style={{background:"none",border:"none",cursor:"pointer",color:pgRequests.includes(post.authorHandle)?th.textDim:"#fbbf24",fontSize:12,padding:0}}>
              {pgRequests.includes(post.authorHandle)?"⏳ Requested":"+ Connect"}
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
);

// ── MESSAGES ─────────────────────────────────────────────────────────────
const MessagesPane = () => {
  const convos = [...new Set([...pgFriends, ...Object.keys(pgMessages)])];
  const msgs = pgMessages[pgActiveConvo]||[];
  const msgEndRef = useRef(null);
  useEffect(()=>{ msgEndRef.current?.scrollIntoView({behavior:"smooth"}); },[pgActiveConvo, pgMessages]);

  return (
    <div style={{display:"flex",gap:0,flex:1,maxWidth:900,margin:"0 auto",width:"100%",height:"100%",minHeight:500}}>
      {/* Sidebar */}
      <div style={{width:isMobile&&pgActiveConvo?"0":"100%",maxWidth:isMobile?"100%":260,flexShrink:0,borderRight:`1px solid ${th.border}`,overflow:"hidden",transition:"all 0.2s"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`}}>
          <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace"}}>CONVERSATIONS</div>
        </div>
        {convos.length===0&&<div style={{padding:"20px 16px",fontSize:12,color:th.textMid}}>No messages yet. Connect with spellcasters from the feed.</div>}
        {convos.map(handle=>{
          const convoMsgs = pgMessages[handle]||[];
          const last = convoMsgs[convoMsgs.length-1];
          const isFriend = pgFriends.includes(handle);
          return(
            <div key={handle} onClick={()=>setPgActiveConvo(handle)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",background:pgActiveConvo===handle?th.surface2:"none",borderBottom:`1px solid ${th.border}`,transition:"background 0.15s"}}>
              <div style={{width:38,height:38,fontSize:18,background:th.surface2,borderRadius:10,border:`1px solid ${isFriend?"#fbbf2444":th.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🧙</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,color:th.text,fontWeight:"500"}}>{handle}</span>
                  {isFriend&&<span style={{fontSize:9,color:"#fbbf24",fontFamily:"monospace"}}>✦</span>}
                </div>
                {last&&<div style={{fontSize:11,color:th.textMid,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",marginTop:2}}>{last.from==="me"?"You: ":""}{last.text}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message thread */}
      {pgActiveConvo ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          {/* Thread header */}
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${th.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            {isMobile&&<button onClick={()=>setPgActiveConvo(null)} style={{background:"none",border:"none",color:th.textMid,cursor:"pointer",fontSize:16,padding:0}}>←</button>}
            <div style={{width:32,height:32,fontSize:18,background:th.surface2,borderRadius:8,border:`1px solid ${th.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>🧙</div>
            <div>
              <div style={{fontSize:14,color:th.text}}>{pgActiveConvo}</div>
              <div style={{fontSize:10,color:pgFriends.includes(pgActiveConvo)?"#fbbf24":th.textDim,fontFamily:"monospace",letterSpacing:1}}>{pgFriends.includes(pgActiveConvo)?"✦ CONNECTED SPELLCASTER":"SPELLCASTER"}</div>
            </div>
          </div>
          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:th.textDim,fontSize:12,fontStyle:"italic"}}>Start the conversation...</div>}
            {msgs.map(msg=>{
              const isMe = msg.from==="me";
              return(
                <div key={msg.id} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:8,alignItems:"flex-end"}}>
                  {!isMe&&<div style={{width:28,height:28,fontSize:15,background:th.surface2,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🧙</div>}
                  <div style={{maxWidth:"72%"}}>
                    <div style={{background:isMe?"#a78bfa22":th.surface2,border:`1px solid ${isMe?"#a78bfa44":th.border}`,borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 14px"}}>
                      <div style={{fontSize:13,color:th.text,lineHeight:1.6}}>{msg.text}</div>
                    </div>
                    <div style={{fontSize:9,color:th.textDim,fontFamily:"monospace",marginTop:3,textAlign:isMe?"right":"left"}}>{timeAgo(msg.ts)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={msgEndRef}/>
          </div>
          {/* Compose */}
          <div style={{padding:"12px 18px",borderTop:`1px solid ${th.border}`,display:"flex",gap:10,flexShrink:0}}>
            <input value={pgMsgDraft} onChange={e=>setPgMsgDraft(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),sendMessage())}
              placeholder="Send a message..." style={{flex:1,background:th.surface2,border:`1px solid ${th.border2}`,borderRadius:10,padding:"10px 14px",color:th.text,fontSize:13,outline:"none",fontFamily:bodyFont}}/>
            <button onClick={sendMessage} style={btn({padding:"10px 16px",flexShrink:0})}>↑</button>
          </div>
        </div>
      ) : (
        !isMobile&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:th.textDim}}>
          <div style={{fontSize:32}}>✉</div>
          <div style={{fontSize:13,fontStyle:"italic"}}>Select a conversation</div>
        </div>
      )}
    </div>
  );
};

// ── FRIENDS / SPELLCASTERS ────────────────────────────────────────────────
const FriendsPane = () => (
  <div style={{maxWidth:600,margin:"0 auto",width:"100%"}}>
    {/* Search / add by handle */}
    <div style={{marginBottom:24}}>
      <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:10}}>FIND A SPELLCASTER BY HANDLE</div>
      <div style={{position:"relative",marginBottom:8}}>
        <div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,color:th.textDim,pointerEvents:"none"}}>@</div>
        <input value={pgFriendInput} onChange={e=>{
          const raw = e.target.value.replace(/[^a-zA-Z0-9_]/g,"").slice(0,20);
          setPgFriendInput(raw);
        }}
          onKeyDown={e=>e.key==="Enter"&&sendFriendRequest()}
          placeholder="enter_handle"
          style={{width:"100%",background:th.surface2,border:`1px solid ${
            pgFriendInput.length>=3
              ? pgFriends.includes(pgFriendInput)||pgRequests.includes(pgFriendInput) ? "#fbbf2488"
              : getEmailByHandle(pgFriendInput)&&pgFriendInput!==profile?.handle ? "#4ade8088"
              : pgFriendInput.length>0 ? "#f8717188"
              : th.border2
            : th.border2}`,borderRadius:10,padding:"10px 13px 10px 28px",color:th.text,fontSize:13,outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}/>
      </div>
      {/* Live handle feedback */}
      {pgFriendInput.length>=3&&(()=>{
        if(pgFriendInput.toLowerCase()===profile?.handle?.toLowerCase()) return <div style={{fontSize:11,color:"#fbbf24",fontFamily:"monospace",marginBottom:10}}>⚠ THAT'S YOUR OWN HANDLE</div>;
        if(pgFriends.includes(pgFriendInput)) return <div style={{fontSize:11,color:"#4ade80",fontFamily:"monospace",marginBottom:10}}>✓ ALREADY CONNECTED</div>;
        if(pgRequests.includes(pgFriendInput)) return <div style={{fontSize:11,color:"#fbbf24",fontFamily:"monospace",marginBottom:10}}>⏳ REQUEST ALREADY SENT</div>;
        const found = getEmailByHandle(pgFriendInput);
        if(found) return <div style={{fontSize:11,color:"#4ade80",fontFamily:"monospace",marginBottom:10}}>✓ SPELLCASTER FOUND — @{pgFriendInput}</div>;
        return <div style={{fontSize:11,color:"#f87171",fontFamily:"monospace",marginBottom:10}}>✗ NO SPELLCASTER WITH THAT HANDLE</div>;
      })()}
      {!pgFriendInput&&<div style={{fontSize:11,color:th.textDim,marginBottom:10,fontStyle:"italic"}}>In the full release, handles are searchable across all registered spellcasters.</div>}
      <button onClick={sendFriendRequest} style={btn({width:"100%"})}>SEND CONNECTION REQUEST</button>
    </div>

    {/* Pending requests */}
    {pgRequests.length>0&&(
      <div style={{marginBottom:24}}>
        <div style={{fontSize:9,color:"#fbbf24",letterSpacing:3,fontFamily:"monospace",marginBottom:10}}>PENDING CONNECTIONS</div>
        {pgRequests.map(h=>(
          <div key={h} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:th.surface,border:`1px solid ${"#fbbf24"}33`,borderRadius:12,marginBottom:8}}>
            <div style={{width:40,height:40,fontSize:22,background:th.surface2,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>🧙</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,color:th.text}}>{h}</div>
              <div style={{fontSize:11,color:th.textDim,marginTop:2}}>Wants to connect</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>acceptRequest(h)} style={btn({fontSize:10,padding:"7px 14px"})}>ACCEPT</button>
              <button onClick={()=>savePgRequests(pgRequests.filter(r=>r!==h))} style={ghost({fontSize:10,padding:"7px 12px"})}>IGNORE</button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Friends list */}
    <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:10}}>CONNECTED SPELLCASTERS — {pgFriends.length}</div>
    {pgFriends.length===0&&<div style={{padding:"24px",background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,textAlign:"center",color:th.textDim,fontSize:12,fontStyle:"italic"}}>No connections yet. Find spellcasters from the feed.</div>}
    {pgFriends.map(h=>(
      <div key={h} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:th.surface,border:`1px solid ${"#fbbf24"}33`,borderRadius:12,marginBottom:8}}>
        <div style={{width:42,height:42,fontSize:22,background:th.surface2,borderRadius:10,border:"1px solid #fbbf2444",display:"flex",alignItems:"center",justifyContent:"center"}}>🧙</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14,color:th.text}}>{h}</span>
            <span style={{fontSize:9,color:"#fbbf24",fontFamily:"monospace",letterSpacing:1}}>✦ CONNECTED</span>
          </div>
          <div style={{fontSize:11,color:th.textDim,marginTop:2}}>Fellow Spellcaster</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setPgActiveConvo(h);setPgTab("messages");}} style={ghost({fontSize:10,padding:"7px 12px"})}>MESSAGE</button>
          <button onClick={()=>savePgFriends(pgFriends.filter(f=>f!==h))} style={{background:"none",border:`1px solid #f8717133`,borderRadius:8,padding:"7px 12px",color:"#f87171",fontSize:10,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>REMOVE</button>
        </div>
      </div>
    ))}

    {/* Beta notice */}
    <div style={{marginTop:32,padding:"16px",background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,textAlign:"center"}}>
      <div style={{fontSize:11,color:"#a78bfa",fontFamily:"monospace",letterSpacing:2,marginBottom:6}}>✦ BACKEND COMING SOON</div>
      <div style={{fontSize:12,color:th.textMid,lineHeight:1.6}}>The Playground currently runs on local demo data. In the full release, your posts, messages and connections will be live across all devices with real spellcasters.</div>
    </div>
  </div>
);

// ── MAIN RENDER ──────────────────────────────────────────────────────────
return (
  <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    {/* Playground header */}
    <div style={{borderBottom:`1px solid ${th.border}`,background:th.surface,flexShrink:0}}>
      <div style={{maxWidth:isMobile?"100%":960,margin:"0 auto",padding:isMobile?"14px 16px":"20px 40px 0",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:9,letterSpacing:4,color:"#fbbf24",fontFamily:"monospace",marginBottom:4}}>COMMUNITY</div>
            <div style={{fontSize:isMobile?20:28,color:th.text,letterSpacing:"-0.5px"}}>🧙 The Wizard's Playground</div>
            <div style={{fontSize:12,color:th.textMid,marginTop:4,marginBottom:isMobile?10:16}}>Share your wins, prompts, and journey with the coven.</div>
          </div>
          {!isMobile&&pgTab==="feed"&&(
            <button onClick={()=>setPgCompose(c=>!c)} style={btn({marginBottom:16,padding:"9px 18px"})}>
              {pgCompose?"✕ CANCEL":"+ NEW POST"}
            </button>
          )}
        </div>
        {/* Tab bar */}
        <div style={{display:"flex",gap:0}}>
          {PG_TABS.map(t=>(
            <button key={t.id} onClick={()=>setPgTab(t.id)}
              style={{padding:"10px 20px",background:"none",border:"none",borderBottom:`2px solid ${pgTab===t.id?"#fbbf24":"transparent"}`,color:pgTab===t.id?"#fbbf24":th.textMid,fontSize:11,cursor:"pointer",letterSpacing:2,fontFamily:"monospace",transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>
              {t.icon} {t.label.toUpperCase()}
              {t.id==="friends"&&pgRequests.length>0&&<span style={{background:"#f87171",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>{pgRequests.length}</span>}
              {t.id==="messages"&&Object.keys(pgMessages).length>0&&pgFriends.length>0&&<span style={{background:"#a78bfa",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>{pgFriends.length}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Tab content */}
    <div style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"24px 40px"}}>
      {pgTab==="feed"    && <FeedPane/>}
      {pgTab==="messages"&& <MessagesPane/>}
      {pgTab==="friends" && <FriendsPane/>}
    </div>
  </div>
);

};

const ProfilePanel = () => {
const isNew = !profile || profileEdit;
const th = THEMES[appearance.theme] || THEMES.dark;
const TABS = [
{id:"profile", label:"Profile"},
{id:"settings", label:"Settings"},
{id:"about", label:"About"},
];

return (
  <>
    <div onClick={()=>{setProfileOpen(false);setProfileEdit(false);setProfileTab("profile");}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:40,backdropFilter:"blur(2px)"}}/>
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:isMobile?"100vw":420,background:th.surface,borderLeft:`1px solid ${th.border}`,zIndex:50,display:"flex",flexDirection:"column",animation:"slideIn 0.25s ease"}}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{padding:"22px 24px 0",borderBottom:`1px solid ${th.border}`,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:9,letterSpacing:4,color:"#a78bfa",fontFamily:"monospace",marginBottom:3}}>SPELLCASTER</div>
            <div style={{fontSize:18,color:th.text,fontStyle:"italic"}}>✦ {profile ? profile.name : "Create Profile"}</div>
            <div style={{fontSize:10,color:th.textDim,fontFamily:"monospace",marginTop:3}}>{userEmail}</div>
          </div>
          <button onClick={()=>{setProfileOpen(false);setProfileEdit(false);setProfileTab("profile");}} style={{background:"none",border:"none",color:th.textMid,fontSize:20,cursor:"pointer",padding:4}}>✕</button>
        </div>
        {/* Tab bar */}
        <div style={{display:"flex",gap:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setProfileTab(t.id);setProfileEdit(false);}}
              style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:`2px solid ${profileTab===t.id?"#a78bfa":"transparent"}`,color:profileTab===t.id?"#a78bfa":th.textMid,fontSize:11,cursor:"pointer",letterSpacing:2,fontFamily:"monospace",transition:"all 0.15s"}}>
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>

        {/* ── PROFILE TAB ─────────────────────────────────────────── */}
        {profileTab==="profile" && (
          isNew ? (
            <div>
              <div style={{fontSize:12,color:th.textMid,marginBottom:20,lineHeight:1.6}}>Create your identity. Earn <span style={{color:"#4ade80"}}>+{XP_REWARDS.createProfile} XP</span>.</div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>CHOOSE YOUR SIGIL</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {AVATARS.map(a=>(
                    <button key={a} onClick={()=>setProfileForm(f=>({...f,avatar:a}))} style={{width:42,height:42,fontSize:22,background:profileForm.avatar===a?"#2a1a4a":th.surface2,border:`2px solid ${profileForm.avatar===a?"#a78bfa":th.border}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{a}</button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>YOUR NAME</div>
                <input value={profileForm.name} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))} placeholder="Enter your name..." style={{width:"100%",background:th.surface2,border:`1px solid ${th.border2}`,borderRadius:8,padding:"11px 13px",color:th.text,fontSize:14,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>YOUR HANDLE</div>
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,color:th.textDim,pointerEvents:"none"}}>@</div>
                  <input
                    value={profileForm.handle}
                    onChange={e=>{
                      const raw = e.target.value.replace(/[^a-zA-Z0-9_]/g,"").slice(0,20);
                      setProfileForm(f=>({...f,handle:raw}));
                      setHandleStatus("checking");
                      clearTimeout(window._handleTimer);
                      window._handleTimer = setTimeout(()=>{
                        const err = validateHandle(raw);
                        if(err){ setHandleStatus(err); return; }
                        const isOwn = raw.toLowerCase()===profile?.handle?.toLowerCase();
                        if(isOwn){ setHandleStatus("available"); return; }
                        setHandleStatus(isHandleTaken(raw)?"taken":"available");
                      },400);
                    }}
                    placeholder="your_handle"
                    style={{width:"100%",background:th.surface2,border:`1px solid ${
                      handleStatus==="available"?"#4ade8088":
                      handleStatus==="taken"||typeof handleStatus==="string"&&handleStatus!=="checking"&&handleStatus!=="available"?"#f8717188":
                      th.border2}`,borderRadius:8,padding:"11px 13px 11px 28px",color:th.text,fontSize:14,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}}/>
                </div>
                {handleStatus&&handleStatus!=="checking"&&(
                  <div style={{marginTop:5,fontSize:11,fontFamily:"monospace",letterSpacing:1,color:
                    handleStatus==="available"?"#4ade80":
                    handleStatus==="taken"?"#f87171":"#fbbf24"}}>
                    {handleStatus==="available"?"✓ HANDLE AVAILABLE":
                     handleStatus==="taken"?"✗ HANDLE TAKEN — CHOOSE ANOTHER":
                     `⚠ ${handleStatus.toUpperCase()}`}
                  </div>
                )}
                {handleStatus==="checking"&&<div style={{marginTop:5,fontSize:11,fontFamily:"monospace",letterSpacing:1,color:th.textDim}}>CHECKING...</div>}
                <div style={{marginTop:5,fontSize:11,color:th.textDim}}>This is how other spellcasters find and connect with you.</div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>YOUR TITLE (OPTIONAL)</div>
                <input value={profileForm.title} onChange={e=>setProfileForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Fantasy Writer, AI Explorer..." style={{width:"100%",background:th.surface2,border:`1px solid ${th.border2}`,borderRadius:8,padding:"11px 13px",color:th.text,fontSize:14,fontFamily:"Georgia,serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={handleSaveProfile} style={btn({flex:1})}>{profile?"SAVE CHANGES":"CREATE PROFILE ✦"}</button>
                {profile&&<button onClick={()=>setProfileEdit(false)} style={ghost()}>CANCEL</button>}
              </div>
            </div>
          ) : (
            <div>
              {/* Avatar + rank card */}
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:"18px",background:th.surface2,borderRadius:14,border:`1px solid ${ri.current.color}33`}}>
                <div style={{width:60,height:60,fontSize:32,background:th.bg,borderRadius:14,border:`2px solid ${ri.current.color}55`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 20px ${ri.current.glow}`,flexShrink:0}}>{profile.avatar||"🧙"}</div>
                <div>
                  <div style={{fontSize:18,color:th.text}}>{profile.name}</div>
                  {profile.handle&&<div style={{fontSize:12,color:"#a78bfa",fontFamily:"monospace",marginTop:1}}>@{profile.handle}</div>}
                  {profile.title&&<div style={{fontSize:12,color:th.textMid,marginTop:2}}>{profile.title}</div>}
                  <div style={{fontSize:10,color:ri.current.color,letterSpacing:2,fontFamily:"monospace",marginTop:5}}>{RANK_SYMBOLS[ri.current.rank]} {ri.current.rank} · Level {ri.current.level}</div>
                </div>
              </div>
              {/* XP bar */}
              <div style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:9,color:th.textDim,letterSpacing:2,fontFamily:"monospace"}}>EXPERIENCE</span>
                  <span style={{fontSize:9,color:ri.current.color,fontFamily:"monospace"}}>{xp} XP</span>
                </div>
                <div style={{height:5,background:th.border,borderRadius:3}}>
                  <div style={{width:`${ri.pct}%`,height:"100%",background:`linear-gradient(90deg,${ri.current.color}99,${ri.current.color})`,borderRadius:3,transition:"width 0.5s",boxShadow:`0 0 8px ${ri.current.glow}`}}/>
                </div>
                {ri.next&&<div style={{fontSize:9,color:th.textDim,fontFamily:"monospace",marginTop:5,textAlign:"right"}}>{ri.xpNeededForNext-ri.xpIntoLevel} XP to Level {ri.next.level}</div>}
              </div>
              {/* Stats grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:22}}>
                {[{label:"SPELLS CAST",value:Math.floor(xp/50)},{label:"SAVED SPELLS",value:mySpells.length},{label:"LESSONS READ",value:lessonsRead.length},{label:"GRIMOIRE",value:isPro?"UNLOCKED":"LOCKED"}].map(s=>(
                  <div key={s.label} style={{background:th.surface2,border:`1px solid ${th.border}`,borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:8,color:th.textDim,letterSpacing:2,fontFamily:"monospace",marginBottom:5}}>{s.label}</div>
                    <div style={{fontSize:14,color:s.value==="UNLOCKED"?"#4ade80":s.value==="LOCKED"?"#f87171":th.text}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* XP guide */}
              <div style={{background:th.surface2,border:`1px solid ${th.border}`,borderRadius:10,padding:"14px 16px",marginBottom:20}}>
                <div style={{fontSize:9,color:th.textDim,letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>HOW TO EARN XP</div>
                {[{action:"Fill a section",xp:XP_REWARDS.fillSection},{action:"Cast a spell",xp:XP_REWARDS.castSpell},{action:"Complete all 5 sections",xp:XP_REWARDS.completeAllSections},{action:"Save to Codex",xp:XP_REWARDS.saveToCodex},{action:"Read a Grimoire lesson",xp:XP_REWARDS.readLesson},{action:"Create profile",xp:XP_REWARDS.createProfile}].map(r=>(
                  <div key={r.action} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <span style={{fontSize:12,color:th.textMid}}>{r.action}</span>
                    <span style={{fontSize:12,color:"#4ade80",fontFamily:"monospace"}}>+{r.xp} XP</span>
                  </div>
                ))}
              </div>
              {!isPro&&<button onClick={()=>{setProfileOpen(false);setShowPaywall(true);}} style={btn({width:"100%",textAlign:"center",padding:"12px",marginBottom:10,background:"linear-gradient(135deg,#a78bfa,#7b6cf6)"})}>🔒 UNLOCK GRIMOIRE</button>}
              <button onClick={()=>{setProfileEdit(true);setHandleStatus(null);setProfileForm({name:profile.name,title:profile.title||"",avatar:profile.avatar||"",handle:profile.handle||""});}} style={ghost({width:"100%",textAlign:"center"})}>EDIT PROFILE</button>
            </div>
          )
        )}

        {/* ── SETTINGS TAB ────────────────────────────────────────── */}
        {profileTab==="settings" && (
          <div>

            {/* Account */}
            <div style={{fontSize:10,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:14}}>ACCOUNT</div>
            <div style={{background:th.surface2,border:`1px solid ${th.border}`,borderRadius:12,overflow:"hidden",marginBottom:24}}>
              {[
                { label:"Edit Profile", icon:"✏️", action:()=>{setProfileTab("profile");setProfileEdit(true);setHandleStatus(null);setProfileForm({name:profile?.name||"",title:profile?.title||"",avatar:profile?.avatar||"",handle:profile?.handle||""});} },
                { label:"Manage Subscription", icon:"💎", action:()=>{setProfileOpen(false);setShowPaywall(true);}, badge: isPro?"PRO":null, badgeColor:"#a78bfa" },
                { label:"Restart App Tour", icon:"🧭", action:()=>{setProfileOpen(false);setTutorialStep(0);setTutorialActive(true);try{localStorage.removeItem(accountKey(userEmail,"tutorial_done"));}catch{}} },
                { label:"Sign Out", icon:"⇤", action:()=>{if(window.confirm("Sign out of your account?"))onLogout();}, danger:true },
              ].map((item,i,arr)=>(
                <button key={item.label} onClick={item.action} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"none",border:"none",borderBottom:i<arr.length-1?`1px solid ${th.border}`:"none",cursor:"pointer",textAlign:"left",transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=th.border}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span style={{fontSize:16,width:24,textAlign:"center"}}>{item.icon}</span>
                  <span style={{flex:1,fontSize:13,color:item.danger?"#f87171":th.text}}>{item.label}</span>
                  {item.badge&&<span style={{fontSize:9,color:item.badgeColor,border:`1px solid ${item.badgeColor}55`,borderRadius:4,padding:"2px 6px",fontFamily:"monospace",letterSpacing:1}}>{item.badge}</span>}
                  {!item.badge&&!item.danger&&<span style={{fontSize:12,color:th.textDim}}>›</span>}
                </button>
              ))}
            </div>

            {/* Appearance */}
            <div style={{fontSize:10,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:14}}>APPEARANCE</div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>BACKGROUND THEME</div>
              <div style={{display:"flex",gap:8}}>
                {[
                  {val:"dark",  label:"Dark",  bg:"#0a0a0f", preview:"#1e1e2a"},
                  {val:"light", label:"Light", bg:"#f4f2ee", preview:"#ddd9d0"},
                ].map(t=>(
                  <button key={t.val} onClick={()=>saveAppearance({...appearance,theme:t.val})}
                    style={{flex:1,padding:"12px 10px",borderRadius:10,border:`2px solid ${appearance.theme===t.val?"#a78bfa":th.border}`,background:t.bg,cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{height:20,borderRadius:4,background:t.preview,marginBottom:8}}/>
                    <div style={{fontSize:11,color:appearance.theme===t.val?"#a78bfa":"#888",fontFamily:"monospace",letterSpacing:1}}>{t.label.toUpperCase()}</div>
                    {appearance.theme===t.val&&<div style={{fontSize:9,color:"#a78bfa",marginTop:3}}>✓ ACTIVE</div>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>FONT STYLE</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{val:"Georgia",label:"Georgia"},{val:"Mono",label:"Mono"},{val:"System",label:"System"}].map(o=>(
                  <button key={o.val} onClick={()=>saveAppearance({...appearance,font:o.val})}
                    style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${o.val===appearance.font?"#a78bfa88":th.border}`,background:o.val===appearance.font?"#a78bfa22":th.surface2,color:o.val===appearance.font?"#a78bfa":th.textMid,fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,transition:"all 0.15s"}}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={{marginTop:10,padding:"10px 14px",background:th.surface2,borderRadius:8,border:`1px solid ${th.border}`,fontSize:13,color:th.textMid,fontFamily:FONTS[appearance.font]||FONTS.Georgia}}>
                The quick brown fox casts a spell.
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:8}}>FONT SIZE</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{val:"small",label:"Small"},{val:"medium",label:"Medium"},{val:"large",label:"Large"}].map(o=>(
                  <button key={o.val} onClick={()=>saveAppearance({...appearance,fontSize:o.val})}
                    style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${o.val===appearance.fontSize?"#a78bfa88":th.border}`,background:o.val===appearance.fontSize?"#a78bfa22":th.surface2,color:o.val===appearance.fontSize?"#a78bfa":th.textMid,fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,transition:"all 0.15s"}}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={{marginTop:10,padding:"10px 14px",background:th.surface2,borderRadius:8,border:`1px solid ${th.border}`,fontSize:FONT_SIZES[appearance.fontSize]||15,color:th.textMid,fontFamily:FONTS[appearance.font]||FONTS.Georgia,lineHeight:1.5}}>
                Aa — {appearance.fontSize.charAt(0).toUpperCase()+appearance.fontSize.slice(1)} ({FONT_SIZES[appearance.fontSize]||15}px)
              </div>
            </div>

          </div>
        )}

        {/* ── ABOUT TAB ───────────────────────────────────────────── */}
        {profileTab==="about" && (
          <div>
            {/* App card */}
            <div style={{textAlign:"center",padding:"28px 20px",background:th.surface2,borderRadius:14,border:`1px solid ${th.border}`,marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:12}}>✦</div>
              <div style={{fontSize:20,color:th.text,fontStyle:"italic",marginBottom:4}}>Wizards Playground</div>
              <div style={{fontSize:11,color:th.textMid,fontFamily:"monospace",letterSpacing:2,marginBottom:16}}>WORDS ARE SPELLS. YOUR PROMPTS SHOULD BE TOO.</div>
              <div style={{display:"inline-flex",gap:8,alignItems:"center",background:th.bg,borderRadius:20,padding:"5px 14px",border:`1px solid ${th.border}`}}>
                <span style={{fontSize:9,color:th.textDim,fontFamily:"monospace",letterSpacing:2}}>VERSION</span>
                <span style={{fontSize:11,color:"#a78bfa",fontFamily:"monospace",letterSpacing:1}}>0.5.0</span>
              </div>
            </div>

            {/* What's in the app */}
            <div style={{fontSize:10,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:14}}>WHAT'S INSIDE</div>
            {[
              {icon:"⚗️", title:"The Prompt Builder", desc:"A five-layer spell construction system — Anchor, Feeling, Voice, Constraint, Permission — that teaches you to communicate with AI precisely and creatively."},
              {icon:"◈", title:"The Codex", desc:"A growing library of pre-built prompt spells across Language Models and Image Generation, plus your personal saved spells."},
              {icon:"📜", title:"The Grimoire", desc:"Four complete AI education courses: The AI Spellbook (prompt anatomy), Bottle Your Brilliance (write your book with AI), Prompting Mastery (10 lessons on technique and terminology), and Demystify AI (8 lessons on how AI actually works)."},
              {icon:"🏆", title:"XP & Progression", desc:"50 levels across 11 ranks — from Apprentice all the way to Merlin. Earn XP by building prompts, casting spells, and completing lessons."},
            ].map(item=>(
              <div key={item.title} style={{display:"flex",gap:14,marginBottom:16,padding:"14px 16px",background:th.surface2,borderRadius:12,border:`1px solid ${th.border}`}}>
                <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:13,color:th.text,marginBottom:4}}>{item.title}</div>
                  <div style={{fontSize:12,color:th.textMid,lineHeight:1.6}}>{item.desc}</div>
                </div>
              </div>
            ))}

            {/* Books */}
            <div style={{fontSize:10,color:th.textDim,letterSpacing:3,fontFamily:"monospace",marginBottom:14,marginTop:24}}>BASED ON</div>
            {[
              {icon:"✦", title:"The AI Spellbook", author:"Prompt anatomy for creatives", color:"#a78bfa"},
              {icon:"🖋", title:"Bottle Your Brilliance", author:"The AI-Powered Author's Blueprint", color:"#34d399"},
            ].map(b=>(
              <div key={b.title} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",background:th.surface2,borderRadius:12,border:`1px solid ${b.color}33`,marginBottom:8}}>
                <span style={{fontSize:20,color:b.color}}>{b.icon}</span>
                <div>
                  <div style={{fontSize:13,color:th.text}}>{b.title}</div>
                  <div style={{fontSize:11,color:th.textMid,fontStyle:"italic",marginTop:2}}>{b.author}</div>
                </div>
              </div>
            ))}

            <div style={{marginTop:24,padding:"14px 16px",background:th.surface2,borderRadius:10,border:`1px solid ${th.border}`,textAlign:"center"}}>
              <div style={{fontSize:11,color:th.textDim,fontFamily:"monospace",letterSpacing:1,marginBottom:4}}>BUILT WITH</div>
              <div style={{fontSize:12,color:th.textMid}}>React · Local Storage · Pure Intention</div>
              <div style={{fontSize:10,color:th.textDim,marginTop:8,fontFamily:"monospace"}}>© 2026 Wizards Playground</div>
            </div>
          </div>
        )}

      </div>
    </div>
  </>
);

};

// ── CODEX PANEL ─────────────────────────────────────────────────────────────
const CodexPanel = () => {
const allCats = ["My Spells",...Object.keys(DEFAULT_CODEX)];
const spells  = codexCat==="My Spells" ? mySpells : DEFAULT_CODEX[codexCat]||[];
const catColor = codexCat==="My Spells" ? "#fbbf24" : CAT_COLORS[codexCat];
return (
<>
<div onClick={()=>setCodexOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:40,backdropFilter:"blur(2px)"}}/>
<div style={{position:"fixed",top:0,right:0,bottom:0,width:isMobile?"100vw":500,background:"#0d0d14",borderLeft:"1px solid #2a2a3a",zIndex:50,display:"flex",flexDirection:"column"}}>
<div style={{padding:"24px 28px 20px",borderBottom:"1px solid #1e1e2a",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div>
<div style={{fontSize:10,letterSpacing:4,color:"#a78bfa",fontFamily:"monospace",marginBottom:4}}>REFERENCE LIBRARY</div>
<div style={{fontSize:24,color:"#e8e4d9",fontStyle:"italic"}}>◈ The Codex</div>
<div style={{fontSize:13,color:"#5a5a7a",marginTop:4}}>Click any spell to load it into your builder.</div>
</div>
<button onClick={()=>setCodexOpen(false)} style={{background:"none",border:"none",color:"#4a4a6a",fontSize:20,cursor:"pointer"}}>✕</button>
</div>
<div style={{display:"flex",borderBottom:"1px solid #1e1e2a",overflowX:"auto",flexShrink:0}}>
{allCats.map(cat=>(
<button key={cat} onClick={()=>setCodexCat(cat)} style={{background:"none",border:"none",borderBottom:codexCat===cat?`2px solid ${cat==="My Spells"?"#fbbf24":CAT_COLORS[cat]}`:"2px solid transparent",padding:"12px 14px",cursor:"pointer",color:codexCat===cat?(cat==="My Spells"?"#fbbf24":CAT_COLORS[cat]):"#4a4a6a",fontSize:9,letterSpacing:1.5,fontFamily:"monospace",whiteSpace:"nowrap",flexShrink:0}}>
{cat==="My Spells"?`✦ MY SPELLS (${mySpells.length})`:cat.toUpperCase()}
</button>
))}
</div>
<div style={{flex:1,overflowY:"auto",padding:"20px"}}>
{spells.length===0 ? (
<div style={{textAlign:"center",padding:"60px 20px"}}>
<div style={{fontSize:40,marginBottom:16}}>📜</div>
<div style={{fontSize:14,color:"#5a5a7a",lineHeight:1.7}}>Your Codex is empty.<br/>Cast a spell and save it to build your library.</div>
</div>
) : spells.map((entry,i)=>(
<div key={i} style={{background:"#13131f",border:"1px solid #2a2a3a",borderRadius:12,padding:"20px",marginBottom:14,cursor:"pointer",transition:"all 0.2s",position:"relative"}}
onMouseEnter={e=>{e.currentTarget.style.borderColor=catColor+"66";e.currentTarget.style.background="#16162a";}}
onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a3a";e.currentTarget.style.background="#13131f";}}
>
{codexCat==="My Spells"&&<button onClick={e=>{e.stopPropagation();const u=mySpells.filter((_,j)=>j!==i);setMySpellsState(u);save("myspells",u);}} style={{position:"absolute",top:14,right:14,background:"none",border:"none",color:"#3a3a5a",fontSize:14,cursor:"pointer"}}>✕</button>}
<div onClick={()=>loadSpell(entry.spell, codexCat==="My Spells" ? (entry.category||null) : codexCat)}>
<div style={{fontSize:15,color:"#e8e4d9",marginBottom:4,paddingRight:20}}>{entry.title}</div>
{entry.description&&<div style={{fontSize:12,color:"#5a5a7a",marginBottom:10}}>{entry.description}</div>}
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
{SECTIONS.filter(s=>entry.spell[s.id]?.trim()).map(s=><div key={s.id} style={{background:"#0a0a14",border:`1px solid ${s.color}33`,borderRadius:10,padding:"2px 10px",fontSize:9,color:s.color,letterSpacing:1,fontFamily:"monospace"}}>{s.label}</div>)}
</div>
<div style={{padding:"10px 12px",background:"#0a0a14",borderRadius:8,borderLeft:`2px solid ${catColor}44`}}>
<div style={{fontSize:11,color:"#4a4a6a",lineHeight:1.7,fontFamily:"monospace"}}>{(entry.spell.voice||entry.spell.anchor||"").slice(0,100)}...</div>
</div>
<div style={{marginTop:10,fontSize:9,color:catColor,letterSpacing:2,fontFamily:"monospace"}}>LOAD INTO SPELLBOOK →</div>
</div>
</div>
))}
</div>
</div>
</>
);
};

// ── SIDEBAR CARD ─────────────────────────────────────────────────────────────
const SidebarProfileCard = () => (
<div style={{margin:"0 16px 12px",padding:"12px 14px",background:"#0d0d1a",border:`1px solid ${ri.current.color}33`,borderRadius:12,cursor:"pointer"}} onClick={()=>setProfileOpen(true)}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
<span style={{fontSize:20}}>{profile?.avatar||"🧙"}</span>
<div>
<div style={{fontSize:12,color:"#e8e4d9"}}>{profile?profile.name:"Create Profile"}</div>
<div style={{fontSize:9,color:ri.current.color,letterSpacing:2,fontFamily:"monospace",marginTop:1}}>{RANK_SYMBOLS[ri.current.rank]} {ri.current.rank} · LVL {ri.current.level}</div>
</div>
</div>
<div style={{height:3,background:"#1e1e2a",borderRadius:2}}>
<div style={{width:`${ri.pct}%`,height:"100%",background:`linear-gradient(90deg,${ri.current.color}88,${ri.current.color})`,borderRadius:2,transition:"width 0.5s",boxShadow:`0 0 6px ${ri.current.glow}`}}/>
</div>
{ri.next&&<div style={{fontSize:9,color:"#3a3a5a",fontFamily:"monospace",marginTop:3}}>{ri.xpNeededForNext-ri.xpIntoLevel} XP to Lv{ri.next.level}</div>}
</div>
);

// ── LESSON VIEW ──────────────────────────────────────────────────────────────
const LessonView = () => {
if(!activeLesson) return null;
const idx = GRIMOIRE.findIndex(l=>l.id===activeLesson.id);
const courseArr = GRIMOIRE.filter(l=>l.course===activeLesson.course);
const courseIdx = courseArr.findIndex(l=>l.id===activeLesson.id);
const nextLesson = courseArr[courseIdx+1]||null;
return (
<div style={{flex:1,overflowY:"auto",padding:isMobile?"24px 20px":"48px 64px",maxWidth:760,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
<button onClick={()=>setView("grimoire")} style={{background:"none",border:"none",color:"#5a5a7a",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:2,marginBottom:32,display:"flex",alignItems:"center",gap:6,padding:0}}>← BACK TO GRIMOIRE</button>
<div style={{marginBottom:8}}>
<div style={{fontSize:9,letterSpacing:3,color:"#5a5a7a",fontFamily:"monospace",marginBottom:6}}>{activeLesson.chapter}</div>
<div style={{fontSize:isMobile?28:38,color:"#e8e4d9",letterSpacing:"-1px",lineHeight:1.1,marginBottom:6}}>
<span style={{color:activeLesson.color||"#a78bfa",marginRight:12}}>{activeLesson.icon}</span>{activeLesson.title}
</div>
<div style={{fontSize:16,color:"#5a5a7a",fontStyle:"italic",marginBottom:16}}>{activeLesson.subtitle}</div>
<div style={{display:"flex",gap:10,marginBottom:32}}>
<span style={{fontSize:10,color:"#3a3a5a",fontFamily:"monospace",letterSpacing:2}}>{activeLesson.readTime.toUpperCase()} READ</span>
{lessonsRead.includes(activeLesson.id)&&<span style={{fontSize:10,color:"#4ade80",fontFamily:"monospace",letterSpacing:2}}>✓ COMPLETED +{XP_REWARDS.readLesson} XP</span>}
</div>
</div>
<div style={{height:1,background:`linear-gradient(90deg,${activeLesson.color||"#a78bfa"}44,transparent)`,marginBottom:40}}/>
{activeLesson.content.map((block,i)=>{
if(block.type==="p") return <p key={i} style={{fontSize:16,color:"#c8c4b8",lineHeight:1.9,marginBottom:20,fontFamily:"Georgia,serif"}}>{block.text}</p>;
if(block.type==="pull") return <blockquote key={i} style={{borderLeft:`3px solid ${activeLesson.color||"#a78bfa"}`,paddingLeft:24,margin:"36px 0",fontSize:18,color:"#e8e4d9",lineHeight:1.7,fontStyle:"italic",fontFamily:"Georgia,serif"}}>{block.text}</blockquote>;
if(block.type==="bold") return <p key={i} style={{fontSize:16,color:"#e8e4d9",lineHeight:1.7,marginBottom:20,fontFamily:"Georgia,serif",fontWeight:700}}>{block.text}</p>;
if(block.type==="examples") return <div key={i} style={{margin:"28px 0",display:"flex",flexDirection:"column",gap:10}}>{block.items.map((item,j)=><div key={j} style={{background:"#0d0d14",border:`1px solid ${activeLesson.color||"#a78bfa"}22`,borderLeft:`3px solid ${activeLesson.color||"#a78bfa"}66`,borderRadius:"0 8px 8px 0",padding:"14px 18px",fontSize:14,color:"#9a9ab8",lineHeight:1.7,fontFamily:"Georgia,serif",fontStyle:"italic"}}>{item}</div>)}</div>;
if(block.type==="glossary") return <div key={i} style={{margin:"28px 0",display:"flex",flexDirection:"column",gap:10}}>{block.terms.map((t,j)=><div key={j} style={{background:"#13131f",border:"1px solid #2a2a3a",borderRadius:10,padding:"16px 20px"}}><div style={{fontSize:13,color:activeLesson.color||"#a78bfa",fontFamily:"monospace",letterSpacing:2,marginBottom:6}}>{t.word.toUpperCase()}</div><div style={{fontSize:14,color:"#9a9ab8",lineHeight:1.6}}>{t.definition}</div></div>)}</div>;
if(block.type==="compare"||block.type==="practice") return (
<div key={i} style={{margin:"32px 0"}}>
{block.label&&<div style={{fontSize:10,color:activeLesson.color||"#a78bfa",letterSpacing:3,fontFamily:"monospace",marginBottom:16}}>{block.label}</div>}
{(block.pairs||block.examples).map((pair,j)=>(
<div key={j} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:12}}>
<div style={{background:"#1a0f0f",border:"1px solid #3a1a1a",borderRadius:10,padding:"14px 16px"}}><div style={{fontSize:9,color:"#f87171",letterSpacing:2,fontFamily:"monospace",marginBottom:6}}>✗ WEAK</div><div style={{fontSize:13,color:"#8a7a7a",lineHeight:1.6,fontStyle:"italic"}}>{pair.weak}</div></div>
<div style={{background:"#0f1a14",border:"1px solid #1a3a24",borderRadius:10,padding:"14px 16px"}}><div style={{fontSize:9,color:"#4ade80",letterSpacing:2,fontFamily:"monospace",marginBottom:6}}>✓ STRONG</div><div style={{fontSize:13,color:"#8ab89a",lineHeight:1.6,fontStyle:"italic"}}>{pair.strong}</div></div>
</div>
))}
</div>
);
return null;
})}
{nextLesson&&(
<div style={{marginTop:56,padding:"24px",background:"#0d0d14",border:"1px solid #1e1e2a",borderRadius:14,cursor:"pointer"}} onClick={()=>openLesson(nextLesson)}>
<div style={{fontSize:9,color:"#3a3a5a",letterSpacing:3,fontFamily:"monospace",marginBottom:6}}>NEXT LESSON</div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><div style={{fontSize:18,color:"#e8e4d9"}}>{nextLesson.icon} {nextLesson.title}</div><div style={{fontSize:13,color:"#5a5a7a",marginTop:4}}>{nextLesson.subtitle}</div></div>
<span style={{fontSize:20,color:nextLesson.tier==="paid"&&!isPro?"#fbbf24":"#5a5a7a"}}>{nextLesson.tier==="paid"&&!isPro?"🔒":"→"}</span>
</div>
</div>
)}
</div>
);
};

// ── GRIMOIRE VIEW ────────────────────────────────────────────────────────────
const GrimoireView = () => {
const courseList = GRIMOIRE.filter(l=>l.course===activeCourse);
const chaps=[...new Set(courseList.map(l=>l.chapter))];
const COURSES = [
{ id:"spellbook",  label:"The AI Spellbook",      icon:"✦",  color:"#a78bfa", subtitle:"Prompt anatomy for creatives",       total:GRIMOIRE.filter(l=>l.course==="spellbook").length },
{ id:"byb",        label:"Bottle Your Brilliance", icon:"🖋", color:"#34d399", subtitle:"AI-powered author's blueprint",       total:GRIMOIRE.filter(l=>l.course==="byb").length },
{ id:"prompting",  label:"Prompting Mastery",      icon:"⚡", color:"#fbbf24", subtitle:"Techniques, terminology & strategy", total:GRIMOIRE.filter(l=>l.course==="prompting").length },
{ id:"demystify",  label:"Demystify AI",            icon:"🌐", color:"#60a5fa", subtitle:"How AI actually works, plainly",      total:GRIMOIRE.filter(l=>l.course==="demystify").length },
];
return (
<div style={{flex:1,overflowY:"auto",padding:isMobile?"16px 16px":"40px 48px",maxWidth:960,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
<div style={{marginBottom:28}}>
<div style={{fontSize:10,letterSpacing:4,color:"#a78bfa",fontFamily:"monospace",marginBottom:8}}>AI EDUCATION PLATFORM</div>
<div style={{fontSize:isMobile?24:34,color:"#e8e4d9",letterSpacing:"-1px",marginBottom:8}}>📜 The Grimoire</div>
<div style={{fontSize:14,color:"#5a5a7a",lineHeight:1.7,maxWidth:560,marginBottom:16}}>Four complete courses. Each lesson earns XP. Learn to prompt, understand AI, and write your book.</div>
{!isPro&&<div style={{display:"flex",alignItems:"center",gap:12,background:"#16102a",border:"1px solid #3a2a6a",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
<span style={{fontSize:20}}>🔒</span>
<div style={{flex:1}}><div style={{fontSize:13,color:"#e8e4d9",marginBottom:2}}>Most lessons require Grimoire access.</div><div style={{fontSize:11,color:"#5a5a7a"}}>First 2 lessons per course are free. Unlock everything for $9.99/mo.</div></div>
<button onClick={()=>setShowPaywall(true)} style={btn({fontSize:10,padding:"8px 14px",whiteSpace:"nowrap"})}>UNLOCK ✦</button>
</div>}
{isPro&&<div style={{display:"flex",alignItems:"center",gap:10,background:"#0f1a14",border:"1px solid #1a3a24",borderRadius:10,padding:"10px 16px",marginBottom:16}}><span style={{color:"#4ade80"}}>✦</span><span style={{fontSize:11,color:"#4ade80",fontFamily:"monospace",letterSpacing:1}}>GRIMOIRE UNLOCKED — ALL FOUR COURSES AVAILABLE</span></div>}
</div>

    {/* Course selector cards */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:32}}>
      {COURSES.map(c=>{
        const cRead=GRIMOIRE.filter(l=>l.course===c.id&&lessonsRead.includes(l.id)).length;
        const isActive=activeCourse===c.id;
        return(
          <div key={c.id} onClick={()=>setActiveCourse(c.id)} style={{background:isActive?"#13131f":"#0d0d14",border:`2px solid ${isActive?c.color+"66":"#1e1e2a"}`,borderRadius:14,padding:"16px 18px",cursor:"pointer",transition:"all 0.2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:20,marginBottom:5}}>{c.icon}</div>
                <div style={{fontSize:14,color:"#e8e4d9",marginBottom:2}}>{c.label}</div>
                <div style={{fontSize:11,color:"#5a5a7a"}}>{c.subtitle}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:12,color:c.color,fontFamily:"monospace"}}>{cRead}/{c.total}</div>
                <div style={{fontSize:9,color:"#3a3a5a",fontFamily:"monospace",marginTop:1}}>READ</div>
              </div>
            </div>
            <div style={{height:3,background:"#1e1e2a",borderRadius:2}}>
              <div style={{width:`${c.total>0?(cRead/c.total*100):0}%`,height:"100%",background:c.color,borderRadius:2,transition:"width 0.5s"}}/>
            </div>
            {isActive&&<div style={{marginTop:6,fontSize:9,color:c.color,letterSpacing:2,fontFamily:"monospace"}}>VIEWING ▼</div>}
          </div>
        );
      })}
    </div>

    {/* Lessons by chapter */}
    {chaps.map(ch=>(
      <div key={ch} style={{marginBottom:36}}>
        <div style={{fontSize:10,letterSpacing:4,color:"#3a3a5a",fontFamily:"monospace",marginBottom:14,paddingBottom:8,borderBottom:"1px solid #1e1e2a"}}>{ch}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {courseList.filter(l=>l.chapter===ch).map(lesson=>{
            const locked=lesson.tier==="paid"&&!hasAccess(lesson.course);
            const read=lessonsRead.includes(lesson.id);
            const lessonNum=courseList.findIndex(l=>l.id===lesson.id)+1;
            return(
              <div key={lesson.id} onClick={()=>openLesson(lesson)} style={{background:"#0d0d14",border:`1px solid ${locked?"#1e1e2a":read?(lesson.color||"#a78bfa")+"44":"#2a2a3a"}`,borderRadius:14,padding:"16px 20px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>{if(!locked){e.currentTarget.style.borderColor=(lesson.color||"#a78bfa")+"66";e.currentTarget.style.background="#13131f";}}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=locked?"#1e1e2a":read?(lesson.color||"#a78bfa")+"44":"#2a2a3a";e.currentTarget.style.background="#0d0d14";}}
              >
                {locked&&<div style={{position:"absolute",inset:0,background:"rgba(10,10,15,0.55)",backdropFilter:"blur(1px)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:20}}><span style={{fontSize:18}}>🔒</span></div>}
                <div style={{width:36,height:36,borderRadius:10,background:"#13131f",border:`1px solid ${locked?"#1e1e2a":(lesson.color||"#a78bfa")+"44"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:locked?0.4:1}}>
                  <span style={{fontSize:read?14:12,color:read?"#4ade80":lesson.color||"#a78bfa"}}>{read?"✓":lessonNum}</span>
                </div>
                <div style={{flex:1,opacity:locked?0.5:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{fontSize:13}}>{lesson.icon}</span>
                    <div style={{fontSize:14,color:"#e8e4d9"}}>{lesson.title}</div>
                    {read&&<span style={{fontSize:8,color:"#4ade80",letterSpacing:2,fontFamily:"monospace"}}>✓ READ</span>}
                  </div>
                  <div style={{fontSize:11,color:"#5a5a7a",marginBottom:4}}>{lesson.subtitle}</div>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:9,color:"#3a3a5a",fontFamily:"monospace"}}>{lesson.readTime.toUpperCase()}</span>
                    <span style={{fontSize:9,color:lesson.tier==="paid"?"#a78bfa":"#4ade80",fontFamily:"monospace"}}>{lesson.tier==="paid"?"PRO":"FREE"}</span>
                    {!read&&<span style={{fontSize:9,color:"#4ade8066",fontFamily:"monospace"}}>+{XP_REWARDS.readLesson} XP</span>}
                  </div>
                </div>
                {!locked&&<span style={{fontSize:14,color:"#3a3a5a",flexShrink:0}}>→</span>}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

};

// ── FINAL VIEW ───────────────────────────────────────────────────────────────
// ── PROMPT QUALITY SCORER ────────────────────────────────────────────────────
const scorePrompt = (vals, assembledText, imageMode=false) => {
const scores = [];
const v = id => (vals[id]||"").trim();
const wordCount = str => str.trim().split(/\s+/).filter(Boolean).length;
const charCount = str => str.trim().length;

// ── DIMENSION 1: Completeness ─────────────────────────────────────────────
const reqIds     = imageMode ? ["voice"] : ["anchor","feeling","voice","constraint"];
const reqFilled  = reqIds.filter(id=>v(id).length>0);
const optFilled  = v("permission").length > 0;
const completePct = (reqFilled.length / reqIds.length) * 100;
scores.push({
  id:"completeness",
  label:"Completeness",
  icon:"◈",
  weight:30,
  raw: reqFilled.length === reqIds.length ? (optFilled ? 100 : 85) : Math.round(completePct),
  detail: reqFilled.length === reqIds.length
    ? optFilled ? "All layers filled — maximum signal." : imageMode ? "Scene filled. Add Format or Reference for sharper output." : "Four required layers filled. Permission layer adds depth."
    : imageMode ? "The Scene layer is the only required layer for image prompts. Fill it to cast." : `${reqFilled.length}/${reqIds.length} required layers filled. Missing: ${reqIds.filter(id=>!v(id)).join(", ")}.`,
});

// ── DIMENSION 2: Specificity (concrete language vs vague) ─────────────────
const vagueWords = ["something","stuff","things","good","nice","better","great","help","maybe","perhaps","kind of","sort of","etc","somehow"];
const powerWords = ["exactly","specifically","always","never","must","only","precisely","ensure","avoid","format","structure","output","return","write","analyse","generate","create","list","explain","compare","rewrite","summarise"];
const lower = assembledText.toLowerCase();
const vagueCount  = vagueWords.filter(w => lower.includes(w)).length;
const powerCount  = powerWords.filter(w => lower.includes(w)).length;
const specificScore = Math.max(0, Math.min(100, 50 + (powerCount * 8) - (vagueCount * 15)));
scores.push({
  id:"specificity",
  label:"Specificity",
  icon:"◎",
  weight:25,
  raw: specificScore,
  detail: vagueCount > 2
    ? `${vagueCount} vague words detected (${vagueWords.filter(w=>lower.includes(w)).slice(0,3).join(", ")}). Replace with precise language.`
    : powerCount >= 3
    ? `Strong action language detected. Prompt gives clear, directive instructions.`
    : "Prompt is reasonably specific. More action verbs would sharpen it.",
});

// ── DIMENSION 3: Depth (word counts per layer) ────────────────────────────
const layerWords = ["anchor","feeling","voice","constraint"].map(id=>wordCount(v(id)));
const avgWords   = layerWords.reduce((a,b)=>a+b,0) / Math.max(layerWords.filter(n=>n>0).length,1);
const thinLayers = ["anchor","feeling","voice","constraint"].filter(id=>v(id).length>0&&wordCount(v(id))<6);
const depthScore = avgWords < 6 ? 30 : avgWords < 12 ? 55 : avgWords < 20 ? 75 : avgWords < 30 ? 90 : 100;
scores.push({
  id:"depth",
  label:"Depth",
  icon:"◻",
  weight:25,
  raw: depthScore,
  detail: thinLayers.length > 0
    ? `Thin layers: ${thinLayers.join(", ")}. Each layer under 6 words may not give AI enough to work with.`
    : avgWords >= 20
    ? "Layers have strong depth. AI has rich context to draw from."
    : "Solid depth. Consider expanding thin layers for richer output.",
});

// ── DIMENSION 4: Format clarity (output structure defined) ────────────────
const formatSignals = ["format","length","words","sentences","paragraphs","bullet","numbered","list","json","table","structure","tone","voice","short","long","brief","concise","detailed","return","output","write in","respond in","use","avoid","no ","don't","never"];
const constraintText = v("constraint").toLowerCase();
const formatCount = formatSignals.filter(s=>constraintText.includes(s)).length;
const hasLength = /\d+\s*(word|sentence|paragraph|char|line|bullet|point|page)/.test(assembledText.toLowerCase());
const formatScore = formatCount === 0 ? 25 : formatCount < 2 ? 50 : formatCount < 4 ? 75 : hasLength ? 100 : 85;
scores.push({
  id:"format",
  label:"Output Format",
  icon:"◇",
  weight:20,
  raw: formatScore,
  detail: formatCount === 0
    ? "No output format defined. Add length, structure, or tone to The Constraint."
    : hasLength
    ? "Excellent. Specific length + structure defined — AI knows exactly what to produce."
    : "Format signals present. Adding a specific length target would sharpen output.",
});

// ── COMPOSITE SCORE ───────────────────────────────────────────────────────
const totalWeight = scores.reduce((a,s)=>a+s.weight,0);
const composite   = Math.round(scores.reduce((a,s)=>a+(s.raw*(s.weight/totalWeight)),0));

// ── VERDICT ───────────────────────────────────────────────────────────────
let verdict, verdictColor, verdictBg, verdictBorder, verdictIcon, advice;
if(composite >= 82) {
  verdict="Strong — Ready to Cast"; verdictIcon="✦"; verdictColor="#4ade80"; verdictBg="#0a1a10"; verdictBorder="#1a4a28";
  advice="This prompt is well-constructed. It gives AI clear role, context, task and format signals. Expect strong, usable output on the first cast.";
} else if(composite >= 62) {
  verdict="Good — Minor Refinement"; verdictIcon="◈"; verdictColor="#fbbf24"; verdictBg="#1a1505"; verdictBorder="#3a2e0a";
  advice="This prompt will produce useful output, but one or two layers need more detail. Check the lowest-scoring dimension below and add specificity there.";
} else if(composite >= 40) {
  verdict="Weak — Needs Refinement"; verdictIcon="◻"; verdictColor="#fb923c"; verdictBg="#1a1005"; verdictBorder="#3a2010";
  advice="The core idea is here but AI doesn't have enough to work with. Fill all required layers and add format signals to The Constraint before casting.";
} else {
  verdict="Incomplete — Not Ready"; verdictIcon="◎"; verdictColor="#f87171"; verdictBg="#1a0a0a"; verdictBorder="#3a1414";
  advice="Too many layers are empty or too thin. AI will guess at your intention and the output will miss the mark. Build out each layer before casting.";
}

return { scores, composite, verdict, verdictColor, verdictBg, verdictBorder, verdictIcon, advice };

};

const quality = useMemo(() => scorePrompt(values, assembled, isImageMode), [assembled, isImageMode]);

// ── FINAL VIEW ───────────────────────────────────────────────────────────────
const FinalView = () => (
<div style={{flex:1,padding:isMobile?"24px 20px":"40px 48px",overflowY:"auto",maxWidth:860,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

  {/* ── QUALITY SCORE CARD ── */}
  <div style={{background:quality.verdictBg,border:`1px solid ${quality.verdictBorder}`,borderRadius:16,padding:"22px 26px",marginBottom:28}}>
    {/* Header row */}
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{fontSize:10,letterSpacing:3,color:quality.verdictColor,fontFamily:"monospace",marginBottom:6}}>PROMPT QUALITY SCORE</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:42,fontWeight:"bold",color:quality.verdictColor,fontFamily:"monospace",lineHeight:1}}>{quality.composite}</div>
          <div>
            <div style={{fontSize:14,color:"#e8e4d9",marginBottom:2}}>{quality.verdictIcon} {quality.verdict}</div>
            <div style={{fontSize:11,color:"#5a5a7a"}}>out of 100</div>
          </div>
        </div>
      </div>
      {/* Circular score ring */}
      <svg width="72" height="72" style={{flexShrink:0}}>
        <circle cx="36" cy="36" r="30" fill="none" stroke="#1e1e2a" strokeWidth="6"/>
        <circle cx="36" cy="36" r="30" fill="none" stroke={quality.verdictColor} strokeWidth="6"
          strokeDasharray={`${Math.round(quality.composite/100*188.5)} 188.5`}
          strokeLinecap="round" strokeDashoffset="47"
          style={{transform:"rotate(-90deg)",transformOrigin:"36px 36px",transition:"stroke-dasharray 0.8s ease"}}/>
        <text x="36" y="41" textAnchor="middle" fill={quality.verdictColor} fontSize="14" fontFamily="monospace" fontWeight="bold">{quality.composite}</text>
      </svg>
    </div>

    {/* Score bar */}
    <div style={{height:4,background:"#1e1e2a",borderRadius:2,marginBottom:14,overflow:"hidden"}}>
      <div style={{width:`${quality.composite}%`,height:"100%",background:`linear-gradient(90deg,${quality.verdictColor}88,${quality.verdictColor})`,borderRadius:2,transition:"width 0.8s ease"}}/>
    </div>

    {/* Advice */}
    <div style={{fontSize:12,color:"#8a8aa8",lineHeight:1.7,marginBottom:20,fontStyle:"italic"}}>"{quality.advice}"</div>

    {/* Dimension breakdown */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
      {quality.scores.map(s=>{
        const col = s.raw>=80?"#4ade80":s.raw>=60?"#fbbf24":s.raw>=40?"#fb923c":"#f87171";
        return(
          <div key={s.id} style={{background:"#0a0a0f",border:`1px solid ${col}22`,borderRadius:10,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:col,fontSize:11}}>{s.icon}</span>
                <span style={{fontSize:11,color:"#e8e4d9",fontFamily:"monospace",letterSpacing:1}}>{s.label.toUpperCase()}</span>
              </div>
              <span style={{fontSize:12,color:col,fontFamily:"monospace",fontWeight:"bold"}}>{s.raw}</span>
            </div>
            <div style={{height:3,background:"#1e1e2a",borderRadius:2,marginBottom:8}}>
              <div style={{width:`${s.raw}%`,height:"100%",background:col,borderRadius:2,transition:"width 0.6s ease"}}/>
            </div>
            <div style={{fontSize:11,color:"#5a5a7a",lineHeight:1.55}}>{s.detail}</div>
          </div>
        );
      })}
    </div>
  </div>

  {/* ── ASSEMBLED PROMPT ── */}
  <div style={{marginBottom:24}}>
    <div style={{fontSize:10,letterSpacing:4,color:"#7b6cf6",fontFamily:"monospace",marginBottom:8}}>✦ YOUR ASSEMBLED SPELL</div>
    <div style={{color:"#5a5a7a",fontSize:14,lineHeight:1.6}}>Every section woven into one clean prompt. Copy and cast it anywhere.</div>
    {spellSaved&&<div style={{marginTop:8,fontSize:11,color:"#4ade80",fontFamily:"monospace",letterSpacing:1}}>✓ SAVED TO YOUR CODEX</div>}
  </div>
  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
    {activeSecs.filter(s=>values[s.id]?.trim()).map(s=><div key={s.id} style={{background:"#1a1a24",border:`1px solid ${s.color}33`,borderRadius:20,padding:"4px 14px",fontSize:11,color:s.color,letterSpacing:1.5,fontFamily:"monospace"}}>{s.symbol} {s.label}</div>)}
  </div>
  <div style={{background:"#0d0d14",border:"1px solid #1e1e2a",borderRadius:14,padding:isMobile?"20px":"32px",marginBottom:20}}>
    <pre style={{margin:0,fontFamily:"monospace",fontSize:isMobile?12:13,lineHeight:1.9,color:"#e8e4d9",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{assembled}</pre>
  </div>
  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
    <button onClick={()=>{navigator.clipboard.writeText(assembled);setCopied(true);setTimeout(()=>setCopied(false),2200);}} style={btn({flex:1,minWidth:120,background:copied?"#1e3a2a":undefined,color:copied?"#4ade80":"#fff",border:copied?"1px solid #2a5a3a":"none"})}>
      {copied?"✓ COPIED":"COPY SPELL"}
    </button>
    {!spellSaved&&<button onClick={()=>setSavePrompt(true)} style={btn({background:"linear-gradient(135deg,#a78bfa,#7b6cf6)"})}>SAVE TO CODEX ◈</button>}
    <button onClick={resetSpell} style={ghost()}>NEW SPELL</button>
  </div>
</div>

);

// ── BUILDER SIDEBAR ──────────────────────────────────────────────────────────
const BuilderSidebar = () => (
<div style={{width:270,borderRight:"1px solid #1e1e2a",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
{SidebarProfileCard()}
{/* Image mode badge */}
{isImageMode&&<div style={{margin:"8px 14px 0",padding:"7px 12px",background:"#1a0f2a",border:"1px solid #f472b644",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
<span style={{fontSize:14}}>🎨</span>
<div>
<div style={{fontSize:9,color:"#f472b6",letterSpacing:2,fontFamily:"monospace"}}>IMAGE MODE</div>
<div style={{fontSize:10,color:"#5a5a7a"}}>Layers adapted for image gen</div>
</div>
</div>}
<div style={{flex:1}}>
{activeSecs.map((s,i)=>{
const isActive=i===active,isDone=values[s.id]?.trim();
return (
<button key={s.id} ref={i===0?el=>tutorialRefs.current["section-0"]=el:null} onClick={()=>setActive(i)} style={{width:"100%",background:isActive?"#13131f":"transparent",border:"none",borderLeft:`2px solid ${isActive?s.color:"transparent"}`,padding:"13px 22px",cursor:"pointer",textAlign:"left",transition:"all 0.15s",boxSizing:"border-box"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:15,color:isDone?s.color:isActive?s.color:"#2a2a3a",transition:"color 0.2s"}}>{isDone?"✓":s.symbol}</span>
<div style={{flex:1}}>
<div style={{fontSize:9,color:isActive?s.color:"#3a3a5a",letterSpacing:2,fontFamily:"monospace",marginBottom:2}}>{s.number}{s.optional?" · OPT":""}</div>
<div style={{fontSize:13,color:isActive?"#e8e4d9":isDone?"#8a8aa8":"#4a4a6a"}}>{s.label}</div>
</div>
{!isDone&&<span style={{fontSize:9,color:"#4ade8055",fontFamily:"monospace"}}>+{XP_REWARDS.fillSection}</span>}
</div>
</button>
);
})}
</div>
<div style={{padding:"10px 14px 14px"}}>
<button onClick={()=>{setCodexOpen(true);setCodexCat("My Spells");}} style={{width:"100%",background:"#0d0d1a",border:"1px solid #2a1a4a",borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"left",marginBottom:10}}>
<div style={{fontSize:9,color:"#a78bfa",letterSpacing:2,fontFamily:"monospace",marginBottom:3}}>◈ THE CODEX</div>
<div style={{fontSize:11,color:"#5a5a7a"}}>Browse & load reference spells.</div>
</button>
<button onClick={()=>setView("grimoire")} style={{width:"100%",background:"#13100a",border:"1px solid #3a2a1a",borderRadius:10,padding:"12px",cursor:"pointer",textAlign:"left",marginBottom:10}}>
<div style={{fontSize:9,color:"#fbbf24",letterSpacing:2,fontFamily:"monospace",marginBottom:3}}>📜 THE GRIMOIRE {!isPro&&"🔒"}</div>
<div style={{fontSize:11,color:"#5a5a7a"}}>{isPro?"Read advanced lessons.":"Unlock advanced lessons."}</div>
</button>
<div style={{padding:"12px 14px",background:"#0d0d14",borderRadius:10,border:`1px solid ${current.color}22`}}>
<div style={{fontSize:9,color:current.color,letterSpacing:2,fontFamily:"monospace",marginBottom:4}}>TIP</div>
<div style={{fontSize:11,color:"#5a5a7a",lineHeight:1.6}}>{current.tip}</div>
</div>
</div>
</div>
);

const BuilderMain = () => (
<div style={{flex:1,padding:"40px 48px",display:"flex",flexDirection:"column",overflowY:"auto"}}>
{loadedSpell&&<div style={{marginBottom:18,padding:"9px 14px",background:isImageMode?"#1a0f2a":"#16102a",border:`1px solid ${isImageMode?"#f472b644":"#3a2a6a"}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<span style={{fontSize:10,color:isImageMode?"#f472b6":"#a78bfa",letterSpacing:1,fontFamily:"monospace"}}>{isImageMode?"🎨 IMAGE SPELL LOADED — ADAPTED FOR VISUAL GENERATION":"◈ CODEX SPELL LOADED — EDITING YOUR VERSION"}</span>
<button onClick={()=>setLoadedSpell(null)} style={{background:"none",border:"none",color:"#4a4a6a",fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>CLEAR</button>
</div>}
<div style={{marginBottom:6}}>
<div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:6}}>
<span style={{fontSize:10,color:current.color,letterSpacing:3,fontFamily:"monospace"}}>{current.number}</span>
<span style={{fontSize:10,color:"#3a3a5a",letterSpacing:3,fontFamily:"monospace"}}>{current.optional?"OPTIONAL":"REQUIRED"}</span>
<span style={{fontSize:10,color:"#4ade8066",letterSpacing:2,fontFamily:"monospace",marginLeft:"auto"}}>+{XP_REWARDS.fillSection} XP on first fill</span>
</div>
<div style={{fontSize:34,color:"#e8e4d9",letterSpacing:"-1px",marginBottom:5,lineHeight:1.1}}>{current.label}</div>
<div style={{fontSize:15,color:current.color,marginBottom:8}}>{current.description}</div>
<div style={{fontSize:14,color:"#5a5a7a",lineHeight:1.7,maxWidth:560}}>{current.prompt}</div>
</div>
<div style={{height:1,background:`linear-gradient(90deg,${current.color}44,transparent)`,margin:"20px 0"}}/>
<textarea value={values[current.id]||""} onChange={e=>handleSectionChange(current.id,e.target.value)} placeholder={current.placeholder} style={{flex:1,minHeight:260,background:"#0d0d14",border:`1px solid ${values[current.id]?.trim()?current.color+"66":"#2a2a3a"}`,borderRadius:12,padding:"22px 26px",color:"#e8e4d9",fontSize:15,lineHeight:1.9,fontFamily:"Georgia,serif",resize:"none",outline:"none",transition:"border-color 0.2s",boxSizing:"border-box"}}
onFocus={e=>{e.target.style.borderColor=current.color+"88";}}
onBlur={e=>{e.target.style.borderColor=values[current.id]?.trim()?current.color+"66":"#2a2a3a";}}
/>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18}}>
<div style={{fontSize:10,color:"#3a3a5a",fontFamily:"monospace",letterSpacing:1}}>{values[current.id]?.length||0} CHARS</div>
<div style={{display:"flex",gap:10}}>
{active>0&&<button onClick={()=>setActive(i=>i-1)} style={ghost()}>← PREV</button>}
{active<activeSecs.length-1 ? <button onClick={()=>setActive(i=>i+1)} style={btn({background:`linear-gradient(135deg,${current.color}cc,${current.color})`})}>NEXT →</button>
: allReqFilled ? <button onClick={handleCast} style={btn()}>CAST SPELL ✦</button>
: <span style={{fontSize:10,color:"#3a3a5a",fontFamily:"monospace",padding:"10px 0",letterSpacing:1}}>FILL REQUIRED SECTIONS</span>}
</div>
</div>
</div>
);

const MobileBuilder = () => (
<>
{isImageMode&&<div style={{margin:"10px 16px 0",padding:"8px 14px",background:"#1a0f2a",border:"1px solid #f472b644",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
<span style={{fontSize:16}}>🎨</span>
<div style={{flex:1}}>
<span style={{fontSize:9,color:"#f472b6",letterSpacing:2,fontFamily:"monospace"}}>IMAGE MODE</span>
<span style={{fontSize:10,color:"#5a5a7a",marginLeft:8}}>Layers adapted for image generation</span>
</div>
</div>}
<div style={{display:"flex",justifyContent:"center",gap:8,padding:"14px 20px 0"}}>
{activeSecs.map((s,i)=><button key={s.id} onClick={()=>setActive(i)} style={{width:i===active?24:8,height:8,borderRadius:4,border:"none",background:i===active?current.color:values[s.id]?.trim()?"#3a3a5a":"#1e1e2a",cursor:"pointer",transition:"all 0.3s",padding:0}}/>)}
</div>
<div style={{flex:1,display:"flex",flexDirection:"column",padding:"18px 20px 20px",overflowY:"auto"}}>
<div style={{marginBottom:16}}>
<div style={{display:"flex",gap:10,marginBottom:4}}>
<span style={{fontSize:10,color:current.color,letterSpacing:3,fontFamily:"monospace"}}>{current.number}</span>
<span style={{fontSize:10,color:"#3a3a5a",letterSpacing:3,fontFamily:"monospace"}}>{current.optional?"OPTIONAL":"REQUIRED"}</span>
<span style={{fontSize:9,color:"#4ade80",letterSpacing:2,fontFamily:"monospace",marginLeft:"auto"}}>+{XP_REWARDS.fillSection} XP</span>
</div>
<div style={{fontSize:26,color:"#e8e4d9",letterSpacing:"-1px",lineHeight:1.1,marginBottom:4}}>{current.label}</div>
<div style={{fontSize:13,color:current.color,marginBottom:6}}>{current.description}</div>
<div style={{fontSize:12,color:"#5a5a7a",lineHeight:1.6}}>{current.prompt}</div>
</div>
<textarea value={values[current.id]||""} onChange={e=>handleSectionChange(current.id,e.target.value)} placeholder={current.placeholder} style={{flex:1,minHeight:160,background:"#0d0d14",border:`1px solid ${values[current.id]?.trim()?current.color+"55":"#2a2a3a"}`,borderRadius:12,padding:16,color:"#e8e4d9",fontSize:14,lineHeight:1.8,fontFamily:"Georgia,serif",resize:"none",outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
<div style={{background:"#0d0d14",border:`1px solid ${current.color}22`,borderRadius:10,padding:"10px 14px",marginBottom:14}}>
<div style={{fontSize:9,color:current.color,letterSpacing:2,fontFamily:"monospace",marginBottom:3}}>TIP</div>
<div style={{fontSize:11,color:"#5a5a7a",lineHeight:1.6}}>{current.tip}</div>
</div>
<div style={{display:"flex",gap:8}}>
{active>0&&<button onClick={()=>setActive(i=>i-1)} style={ghost({flex:1,padding:"10px 12px"})}>← BACK</button>}
{active<activeSecs.length-1 ? <button onClick={()=>setActive(i=>i+1)} style={btn({flex:2,background:`linear-gradient(135deg,${current.color}cc,${current.color})`})}>NEXT →</button>
: allReqFilled ? <button onClick={handleCast} style={btn({flex:2})}>CAST SPELL ✦</button>
: <div style={{flex:2,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,color:"#3a3a5a",fontFamily:"monospace",letterSpacing:1}}>FILL REQUIRED SECTIONS</span></div>}
</div>
</div>
</>
);

// ── TUTORIAL OVERLAY ─────────────────────────────────────────────────────────
const TutorialOverlay = () => {
const step = TUTORIAL_STEPS[tutorialStep];
if(!step) return null;

const ARROW_STYLES = {
  top:    {position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderBottom:"8px solid #a78bfa"},
  bottom: {position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderTop:"8px solid #a78bfa"},
  left:   {position:"absolute",left:-8,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"8px solid transparent",borderBottom:"8px solid transparent",borderRight:"8px solid #a78bfa"},
  right:  {position:"absolute",right:-8,top:"50%",transform:"translateY(-50%)",width:0,height:0,borderTop:"8px solid transparent",borderBottom:"8px solid transparent",borderLeft:"8px solid #a78bfa"},
};

return (
  <div style={{position:"fixed",inset:0,zIndex:9000,pointerEvents:"none"}}>
    {/* Dark overlay with spotlight cutout */}
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"all"}} onClick={nextStep}>
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white"/>
          {spotlightRect&&<rect x={spotlightRect.left} y={spotlightRect.top} width={spotlightRect.width} height={spotlightRect.height} rx={spotlightRect.borderRadius} fill="black"/>}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#spotlight-mask)"/>
    </svg>

    {/* Spotlight border glow */}
    {spotlightRect&&(
      <div style={{position:"absolute",top:spotlightRect.top,left:spotlightRect.left,width:spotlightRect.width,height:spotlightRect.height,borderRadius:spotlightRect.borderRadius,border:"2px solid #a78bfa",boxShadow:"0 0 0 4px #a78bfa22, 0 0 24px #a78bfa44",pointerEvents:"none",transition:"all 0.3s"}}/>
    )}

    {/* Tooltip card */}
    <div ref={tooltipRef} style={{position:"fixed",zIndex:9001,...(tooltipPos.transform?{top:tooltipPos.top,left:tooltipPos.left,transform:tooltipPos.transform}:{top:tooltipPos.top,left:tooltipPos.left}),width:Math.min(300,window.innerWidth-32),background:"#13131f",border:"1px solid #a78bfa55",borderRadius:16,padding:"20px 22px",boxShadow:"0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px #a78bfa22",pointerEvents:"all",animation:"tooltipPop 0.2s ease"}}>
      <style>{`@keyframes tooltipPop{from{opacity:0;transform:${tooltipPos.transform||""}scale(0.92)}to{opacity:1;transform:${tooltipPos.transform||""}scale(1)}}`}</style>

      {/* Arrow */}
      {tooltipPos.arrowDir&&<div style={ARROW_STYLES[tooltipPos.arrowDir]}/>}

      {/* Step counter */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:5}}>
          {TUTORIAL_STEPS.map((_,i)=>(
            <div key={i} style={{width:i===tutorialStep?16:6,height:6,borderRadius:3,background:i===tutorialStep?"#a78bfa":i<tutorialStep?"#a78bfa55":"#2a2a3a",transition:"all 0.3s"}}/>
          ))}
        </div>
        <button onClick={dismissTutorial} style={{background:"none",border:"none",color:"#3a3a5a",fontSize:13,cursor:"pointer",padding:"2px 6px",borderRadius:4}} title="Skip tour">SKIP</button>
      </div>

      {/* Content */}
      <div style={{fontSize:15,color:"#e8e4d9",marginBottom:8,lineHeight:1.4}}>{step.title}</div>
      <div style={{fontSize:13,color:"#8a8aaa",lineHeight:1.65,marginBottom:18}}>{step.body}</div>

      {/* Controls */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {tutorialStep>0&&(
          <button onClick={e=>{e.stopPropagation();prevStep();}} style={{background:"none",border:"1px solid #2a2a3a",borderRadius:8,padding:"7px 14px",color:"#5a5a7a",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>← BACK</button>
        )}
        <button onClick={e=>{e.stopPropagation();nextStep();}} style={{flex:1,background:"linear-gradient(135deg,#7b6cf6,#a78bfa)",border:"none",borderRadius:8,padding:"9px 16px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:2,fontWeight:"bold"}}>
          {tutorialStep===TUTORIAL_STEPS.length-1?"LET'S GO ✦":"NEXT →"}
        </button>
      </div>

      {/* Hint */}
      <div style={{marginTop:10,textAlign:"center",fontSize:10,color:"#3a3a5a",fontFamily:"monospace",letterSpacing:1}}>Click anywhere to advance</div>
    </div>
  </div>
);

};

return (
<div style={{minHeight:"100vh",height:"100vh",background:T.bg,color:T.text,fontFamily:bodyFont,fontSize:bodySize,display:"flex",flexDirection:"column",overflow:"hidden",transition:"background 0.3s,color 0.3s"}}>
<style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
{Header()}
{codexOpen&&CodexPanel()}
{profileOpen&&ProfilePanel()}
{SavePromptModal()}{PaywallModal()}{XPToast()}{LevelUpOverlay()}
{tutorialActive&&TutorialOverlay()}
{view==="lesson" ? LessonView()
: view==="grimoire" ? GrimoireView()
: view==="playground" ? PlaygroundView()
: showFinal ? FinalView()
: isMobile ? MobileBuilder()
: <div style={{flex:1,display:"flex",overflow:"hidden"}}>{BuilderSidebar()}{BuilderMain()}</div>}
</div>
);
}

// ─── ROOT ORCHESTRATOR ────────────────────────────────────────────────────────

// ─── ROOT ORCHESTRATOR ────────────────────────────────────────────────────────
export default function App() {
const [appStage, setAppStage] = useState("intro");
const [userEmail, setUserEmail] = useState(null);

useEffect(() => {
const email = getActiveEmail();
if (email && getAccounts()[email]) {
setUserEmail(email);
}
setAppStage("intro");
}, []);

const handleIntroDone = () => {
const email = getActiveEmail();
if (email && getAccounts()[email]) {
setUserEmail(email);
setAppStage("app");
} else {
setAppStage("auth");
}
};

const handleLogin = (email) => {
setUserEmail(email);
setAppStage("app");
};

const handleLogout = () => {
setActiveEmail(null);
setUserEmail(null);
setAppStage("auth");
};

if (appStage === "intro") return <IntroScreen onDone={handleIntroDone} />;
if (appStage === "auth")  return <AuthScreen onLogin={handleLogin} />;
return <SpellBookApp userEmail={userEmail} onLogout={handleLogout} />;
}