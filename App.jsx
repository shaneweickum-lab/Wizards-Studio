import { useState, useEffect, useRef, useMemo } from "react";

// ─── RUNES ────────────────────────────────────────────────────────────────────
const RUNES = ["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ","ᚷ","ᚹ","ᚺ","ᚾ","ᛁ","ᛃ","ᛇ","ᛈ","ᛉ","ᛊ","ᛏ","ᛒ","ᛖ","ᛗ","ᛚ","ᛜ","ᛞ","ᛟ","ᚦ","ᚣ","ᛣ","ᛤ","✦","◈","⊕","◎","◇","◻","❋"];


const C = {
  bg:"#08080e", surface:"#0e0e18", surface2:"#13131f",
  border:"#1c1c2a", border2:"#262636",
  text:"#e8e4d9", textMid:"#56566e", textDim:"#30303e",
  purple:"#a78bfa", pink:"#f472b6", green:"#34d399",
  orange:"#fb923c", blue:"#60a5fa", gold:"#fbbf24",
};

// ─── SECTIONS ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"anchor",     label:"The Anchor",     number:"01", symbol:"⊕", color:C.purple,
    description:"Who is speaking.",
    prompt:"Set the role, expertise, and perspective you want the AI to inhabit.",
    placeholder:"You are a senior UX researcher with 10 years in fintech, specialising in onboarding flows for anxious first-time users…",
    tip:"The strongest prompts start here. 'You are a…' anchors everything that follows.", optional:false },
  { id:"feeling",    label:"The Feeling",    number:"02", symbol:"◎", color:C.pink,
    description:"What surrounds it.",
    prompt:"Give the context, backstory, and situation the AI needs before it can begin.",
    placeholder:"I'm building a mobile app for Gen Z users navigating financial anxiety for the first time…",
    tip:"Don't assume the AI knows what you know. Surface the details that would change the answer.", optional:false },
  { id:"voice",      label:"The Voice",      number:"03", symbol:"◈", color:C.green,
    description:"What must be done.",
    prompt:"State the task with precision. One clear action, not five vague ones.",
    placeholder:"Write three onboarding screens. Each should feel like a trusted friend talking — warm, specific, zero jargon…",
    tip:"Use action verbs. Write. Analyze. Rewrite. Compare. Generate. Vague tasks get vague results.", optional:false },
  { id:"constraint", label:"The Constraint", number:"04", symbol:"◻", color:C.orange,
    description:"The shape it must take.",
    prompt:"Define the output format — structure, length, tone, language, any rules.",
    placeholder:"Return each screen as a JSON object: { headline, subtext, cta }. Max 12 words per headline…",
    tip:"If you need JSON, say JSON. If you need a list, say a list. Format shapes thinking.", optional:false },
  { id:"permission", label:"The Permission", number:"05", symbol:"◇", color:C.blue,
    description:"What it's allowed to become.",
    prompt:"Show what good looks like. One great example is worth ten lines of description.",
    placeholder:"Here's a screen I love: 'Hey — no pressure. We're just glad you're here.' That tone. That trust…",
    tip:"Showing beats telling. Paste even one example of what you want and everything sharpens.", optional:true },
];

const IMAGE_SECTIONS = [
  { id:"anchor",     label:"The Subject",   number:"01", symbol:"⊕", color:C.purple,
    description:"What are you generating.",
    prompt:"Describe the core subject, scene type, or medium.",
    placeholder:"Cinematic portrait of a woman in her 40s, shot on 35mm film, standing in a doorway…",
    tip:"Name the output type first — portrait, landscape, product shot, illustration.", optional:true },
  { id:"feeling",    label:"The Mood",      number:"02", symbol:"◎", color:C.pink,
    description:"The emotional atmosphere.",
    prompt:"Describe the feeling, energy, and emotional register of the image.",
    placeholder:"Quiet power. The moment before something important. Melancholic but not sad…",
    tip:"Mood is the invisible layer that makes an image feel intentional rather than accidental.", optional:true },
  { id:"voice",      label:"The Scene",     number:"03", symbol:"◈", color:C.green,
    description:"The visual detail.",
    prompt:"Describe what is actually in the image — composition, lighting, colour, texture.",
    placeholder:"Golden hour light raking from the left. Shallow depth of field. Eyes sharp, background soft…",
    tip:"This is your main layer. Paint it in detail.", optional:false },
  { id:"constraint", label:"The Format",    number:"04", symbol:"◻", color:C.orange,
    description:"Technical specifications.",
    prompt:"Aspect ratio, style, rendering constraints, what to avoid.",
    placeholder:"Aspect ratio 2:3. Photorealistic. No AI smoothing on skin. No lens flare…",
    tip:"Aspect ratio, quality tags, and what NOT to include matter equally.", optional:true },
  { id:"permission", label:"The Reference", number:"05", symbol:"◇", color:C.blue,
    description:"Style and creative license.",
    prompt:"Name visual references, artists, film directors, or give creative latitude.",
    placeholder:"Reference: the visual language of Paolo Sorrentino. One unexpected lighting choice…",
    tip:"Film references, photographer names, or art movements give image AI a strong style target.", optional:true },
];

function detectImageMode(values) {
  const all = Object.values(values).join(" ").toLowerCase();
  const signals = ["aspect ratio","photorealistic","bokeh","depth of field","35mm","film grain",
    "portrait","render","illustration","cinematic","shot on","lighting","composition",
    "palette","texture","midjourney","stable diffusion","dall-e","dalle","flux","4k","8k",
    "hyperrealistic","oil painting","watercolor","pixel art","concept art","diffusion","negative prompt"];
  return signals.filter(s => all.includes(s)).length >= 2;
}

// ─── CODEX DATA ───────────────────────────────────────────────────────────────
const DEFAULT_CODEX = {
  "Language Models": [
    { title:"Deep Research Brief", description:"Extract the real picture, not the consensus.",
      spell:{ anchor:"You are a world-class research analyst and investigative journalist with deep domain expertise.", feeling:"I need a comprehensive, honest analysis of [TOPIC]. Not the surface-level consensus — the real picture, including what's contested, what's overlooked, and what the mainstream view gets wrong.", voice:"Analyze this in four sections: (1) Core Claim — the strongest version of the mainstream view. (2) Evidence For — the best supporting evidence. (3) Evidence Against — the strongest counterarguments and contradictory data. (4) Synthesis — your honest assessment of where the truth probably lies.", constraint:"Each section clearly labeled. Cite the type of evidence (studies, expert consensus, historical data) rather than specific URLs. Flag where your confidence is lower. Minimum 400 words.", permission:"If the evidence genuinely supports a contrarian conclusion, say so directly. Don't hedge to stay safe." }},
    { title:"Brand Voice Copywriter", description:"Copy that sounds like a specific brand, not like AI.",
      spell:{ anchor:"You are a senior brand copywriter with 15 years writing for premium consumer brands. You think in headlines first, emotions second, features never.", feeling:"I need copy for [BRAND/PRODUCT]. The brand is [describe brand personality]. The reader is [describe target customer and their emotional state].", voice:"Write [copy type: headline / product description / email / social caption]. The copy should make the reader feel [desired emotion], not inform them of features.", constraint:"No adjectives that describe the product as 'innovative', 'cutting-edge', 'revolutionary', or 'world-class'. No passive voice. Max [X] words. End with action, not conclusion.", permission:"If there's a more honest or unexpected angle that serves the brand better, show it alongside what I asked for." }},
    { title:"Socratic Debate Partner", description:"Pressure-test any idea without mercy.",
      spell:{ anchor:"You are a rigorous intellectual interlocutor — part philosopher, part litigator, part scientist. Your job is not to agree with me but to make my thinking stronger.", feeling:"I want to pressure-test the following idea: [STATE YOUR IDEA]. I believe it because [give your reasoning]. I want you to find every weakness, assumption, and blind spot in my argument.", voice:"Take the strongest possible opposing position. Don't strawman me — steelman my argument first, then dismantle it. Identify: (1) the weakest assumption I'm making, (2) the best counterexample to my claim, (3) an alternative framework that explains the same evidence differently.", constraint:"No agreeing with me to be polite. No hedging phrases like 'you raise a good point.' Direct, specific, intellectually rigorous.", permission:"If my idea is actually sound, say so — but only after genuinely trying to break it." }},
    { title:"Technical Concept Explainer", description:"Complex ideas made genuinely clear.",
      spell:{ anchor:"You are a brilliant science communicator who can explain anything to anyone without condescension or oversimplification. You think in analogies first.", feeling:"I need to understand [CONCEPT] at a deep level. I have [describe your background] and I'm trying to understand this because [give context].", voice:"Explain this in three layers: (1) The intuition — a concrete analogy that makes the core idea click. (2) The mechanics — how it actually works. (3) The implications — what changes once you understand this correctly.", constraint:"No jargon without immediate definition. Each layer must be self-contained. Analogies must be truly analogous, not just metaphorically similar.", permission:"If the most common explanation of this concept is subtly wrong, correct it. I want the accurate version." }},
    { title:"The Harsh Editor", description:"Cut everything that doesn't earn its place.",
      spell:{ anchor:"You are a ruthless developmental editor at a major literary press. You've edited bestsellers. You have no sentimentality about prose that isn't working.", feeling:"I'm going to share a piece of writing. I want you to edit it as if you were preparing it for publication — not for my feelings.", voice:"Read the piece and give me: (1) The single biggest structural problem. (2) The three weakest passages and exactly why. (3) What the piece is actually about versus what it thinks it's about. (4) A rewritten version of the opening paragraph.", constraint:"No praise unpaired with a specific observation. No softening language. Direct diagnosis.", permission:"If the piece needs restructuring rather than editing — say so." }},
  ],
  "Image Generation": [
    { title:"Cinematic Portrait", description:"Film-quality character portraits with mood.",
      spell:{ anchor:"Cinematic close-up portrait, 35mm film photography aesthetic", feeling:"Quiet intensity. The moment before a significant decision. Presence without performance.", voice:"Subject centered, slight downward gaze. Single practical light source from camera left, warm tungsten. Fine film grain. Shallow depth of field, background suggestion only.", constraint:"Aspect ratio 2:3. Photorealistic. No AI skin smoothing. No artificial lens flare. No blown highlights.", permission:"Reference: the intimate portrait work of Chloe Zhao and Gregory Crewdson. One unexpected compositional choice." }},
    { title:"Product Hero Shot", description:"Commercial product photography, editorial quality.",
      spell:{ anchor:"Commercial product photography, editorial quality, for a premium [PRODUCT CATEGORY]", feeling:"Considered luxury. The feeling of owning something made with genuine care. Restrained desire.", voice:"Product centered on a [surface: marble / slate / linen / concrete] surface. Studio lighting — soft diffused light from above and behind. Hero angle, 3/4 view. Colour story: [2-3 palette colours].", constraint:"Aspect ratio 4:5. Photorealistic render quality. Clean background. No props that distract from product.", permission:"One subtle environmental detail that adds narrative context without cluttering the composition." }},
    { title:"Editorial Illustration", description:"Magazine-quality conceptual illustration.",
      spell:{ anchor:"Editorial illustration for a [publication type: magazine / newspaper / book cover], [illustration style: flat graphic / painterly / collage / line art]", feeling:"Conceptual punch. The image should work as a visual metaphor for [THEME/CONCEPT]. Thought-provoking without being literal.", voice:"Strong compositional geometry. Limited, intentional palette — 3 colours maximum plus black and white. Central subject clear from 10 feet away.", constraint:"Aspect ratio 3:4. No photorealistic elements. No text.", permission:"If there's a stranger, more arresting visual approach to this concept, find it." }},
    { title:"Architectural Mood", description:"Interior or exterior spaces with atmosphere.",
      spell:{ anchor:"Architectural photography / render of a [SPACE TYPE: interior / exterior / urban / natural]", feeling:"[Choose: contemplative stillness / productive calm / dramatic grandeur / intimate warmth]. The space should feel inhabited but not busy.", voice:"Wide angle, strong perspective lines. Natural light as primary source. Golden hour or overcast for exterior. Ambient practical lighting for interior.", constraint:"Aspect ratio 16:9. Photorealistic. Human figure optional — if present, small and contextual only.", permission:"If the most interesting composition isn't the obvious one, find it." }},
  ],
};

const CAT_COLORS = { "Language Models":C.purple, "Image Generation":C.pink };

// ─── QUALITY SCORER ───────────────────────────────────────────────────────────
function scorePrompt(vals, assembledText, imageMode = false) {
  const scores = [];
  const v = id => (vals[id] || "").trim();
  const wordCount = str => str.trim().split(/\s+/).filter(Boolean).length;

  const reqIds = imageMode ? ["voice"] : ["anchor","feeling","voice","constraint"];
  const reqFilled = reqIds.filter(id => v(id).length > 0);
  const optFilled = v("permission").length > 0;
  scores.push({
    id:"completeness", label:"Completeness", icon:"◈", weight:30,
    raw: reqFilled.length === reqIds.length ? (optFilled ? 100 : 85) : Math.round((reqFilled.length/reqIds.length)*100),
    detail: reqFilled.length === reqIds.length
      ? optFilled ? "All five layers filled — maximum signal."
        : imageMode ? "Scene filled. Add Format or Reference for sharper output."
        : "Four required layers filled. The Permission layer adds depth."
      : `${reqFilled.length}/${reqIds.length} required layers filled. Missing: ${reqIds.filter(id=>!v(id)).join(", ")}.`,
  });

  const vagueWords = ["something","stuff","things","good","nice","better","great","help","maybe","perhaps","kind of","sort of","etc","somehow"];
  const powerWords = ["exactly","specifically","always","never","must","only","precisely","ensure","avoid","format","structure","output","return","write","analyse","analyze","generate","create","list","explain","compare","rewrite","summarise","summarize"];
  const lower = assembledText.toLowerCase();
  const vagueCount = vagueWords.filter(w => lower.includes(w)).length;
  const powerCount = powerWords.filter(w => lower.includes(w)).length;
  scores.push({
    id:"specificity", label:"Specificity", icon:"◎", weight:25,
    raw: Math.max(0, Math.min(100, 50 + (powerCount*8) - (vagueCount*15))),
    detail: vagueCount > 2
      ? `${vagueCount} vague words detected (${vagueWords.filter(w=>lower.includes(w)).slice(0,3).join(", ")}). Replace with precise language.`
      : powerCount >= 3 ? "Strong action language detected. Prompt gives clear, directive instructions."
      : "Reasonably specific. More action verbs would sharpen it.",
  });

  const layerWords = ["anchor","feeling","voice","constraint"].map(id => wordCount(v(id)));
  const avgWords = layerWords.reduce((a,b)=>a+b,0) / Math.max(layerWords.filter(n=>n>0).length,1);
  const thinLayers = ["anchor","feeling","voice","constraint"].filter(id => v(id).length>0 && wordCount(v(id))<6);
  scores.push({
    id:"depth", label:"Depth", icon:"◻", weight:25,
    raw: avgWords<6?30:avgWords<12?55:avgWords<20?75:avgWords<30?90:100,
    detail: thinLayers.length > 0
      ? `Thin layers: ${thinLayers.join(", ")}. Under 6 words may not give AI enough to work with.`
      : avgWords >= 20 ? "Layers have strong depth. AI has rich context to draw from."
      : "Solid depth. Expanding thinner layers will improve output.",
  });

  const formatSignals = ["format","length","words","sentences","paragraphs","bullet","numbered","list","json","table","structure","tone","short","long","brief","concise","detailed","return","output","write in","respond in","avoid","no ","don't","never"];
  const constraintText = v("constraint").toLowerCase();
  const formatCount = formatSignals.filter(s => constraintText.includes(s)).length;
  const hasLength = /\d+\s*(word|sentence|paragraph|char|line|bullet|point|page)/.test(assembledText.toLowerCase());
  scores.push({
    id:"format", label:"Output Format", icon:"◇", weight:20,
    raw: formatCount===0?25:formatCount<2?50:formatCount<4?75:hasLength?100:85,
    detail: formatCount===0 ? "No output format defined. Add length, structure, or tone to The Constraint."
      : hasLength ? "Specific length + structure defined — AI knows exactly what to produce."
      : "Format signals present. A specific length target would sharpen output further.",
  });

  const totalWeight = scores.reduce((a,s)=>a+s.weight,0);
  const composite = Math.round(scores.reduce((a,s)=>a+(s.raw*(s.weight/totalWeight)),0));

  let verdict, verdictColor, verdictBg, verdictBorder, verdictIcon, advice;
  if (composite >= 82) {
    verdict="Strong — Ready to Cast"; verdictIcon="✦"; verdictColor="#4ade80"; verdictBg="#07120c"; verdictBorder="#1a4a28";
    advice="Well-constructed. AI has clear role, context, task, and format signals. Expect strong output on the first cast.";
  } else if (composite >= 62) {
    verdict="Good — Minor Refinement"; verdictIcon="◈"; verdictColor="#fbbf24"; verdictBg="#130f04"; verdictBorder="#3a2e0a";
    advice="Will produce useful output, but one or two layers need more detail. Check the lowest-scoring dimension below.";
  } else if (composite >= 40) {
    verdict="Weak — Needs Work"; verdictIcon="◻"; verdictColor="#fb923c"; verdictBg="#110a04"; verdictBorder="#3a2010";
    advice="The core idea is here but AI doesn't have enough to work with. Fill all required layers and define output format.";
  } else {
    verdict="Incomplete — Not Ready"; verdictIcon="◎"; verdictColor="#f87171"; verdictBg="#100707"; verdictBorder="#3a1414";
    advice="Too many layers are empty or too thin. AI will guess at your intention and miss the mark.";
  }
  return { scores, composite, verdict, verdictColor, verdictBg, verdictBorder, verdictIcon, advice };
}

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const LS_KEY = "ps_myspells_v1";
function loadSpells() { try { return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch { return []; } }
function saveSpells(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {} }

// ─── GHOST BUTTON STYLE ───────────────────────────────────────────────────────
const ghostBtn = (extra={}) => ({
  padding:"12px 24px", background:"transparent", border:`1px solid ${C.border2}`,
  borderRadius:10, color:C.textMid, fontSize:11, cursor:"pointer",
  letterSpacing:2, fontFamily:"monospace", ...extra,
});
const primaryBtn = (extra={}) => ({
  padding:"12px 24px", background:"linear-gradient(135deg,#7b6cf6,#c084fc)",
  border:"none", borderRadius:10, color:"#fff", fontSize:11, cursor:"pointer",
  letterSpacing:2, fontFamily:"monospace", ...extra,
});

// ─── SIDEBAR (outside main — no remount on parent rerender) ───────────────────
function Sidebar({ activeSecs, active, setActive, values, filled, progress, quality, view, setView, resetSpell }) {
  return (
    <div style={{ width:220, flexShrink:0, borderRight:`1px solid ${C.border}`,
      display:"flex", flexDirection:"column", overflowY:"auto", background:C.surface }}>

      <div style={{ padding:"20px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:9, color:C.textDim, letterSpacing:3, fontFamily:"monospace", marginBottom:8 }}>FIVE LAYERS</div>
        <div style={{ height:2, background:C.border, borderRadius:1, overflow:"hidden" }}>
          <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${C.purple}88,${C.purple})`, transition:"width 0.4s" }} />
        </div>
        <div style={{ fontSize:9, color:C.textMid, fontFamily:"monospace", marginTop:6 }}>{filled}/{activeSecs.length} filled</div>
      </div>

      {filled > 0 && (
        <button onClick={() => setView(v => v==="quality"?"builder":"quality")}
          style={{ margin:"10px 12px 0", padding:"10px 14px", boxSizing:"border-box", width:"calc(100% - 24px)",
            background: view==="quality" ? `${quality.verdictColor}12` : C.surface2,
            border:`1px solid ${view==="quality" ? quality.verdictColor+"44" : C.border}`,
            borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", gap:10, transition:"all 0.2s" }}>
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

      {activeSecs.map((sec, i) => {
        const val = values[sec.id]?.trim();
        const isActive = active===i;
        return (
          <div key={sec.id} onClick={() => setActive(i)}
            style={{ padding:"14px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
              borderLeft:`2px solid ${isActive ? sec.color : "transparent"}`,
              background: isActive ? `${sec.color}08` : "transparent", transition:"all 0.15s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14, color: val ? sec.color : C.textDim }}>{val?"●":"○"}</span>
              <div>
                <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, fontFamily:"monospace" }}>{sec.number}</div>
                <div style={{ fontSize:12, color: isActive ? sec.color : (val ? C.text : C.textMid) }}>{sec.label}</div>
              </div>
              {sec.optional && <span style={{ fontSize:8, color:C.textDim, fontFamily:"monospace", marginLeft:"auto" }}>opt</span>}
            </div>
            {val && (
              <div style={{ fontSize:10, color:C.textMid, marginTop:6, lineHeight:1.5,
                overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                {val.slice(0,60)}…
              </div>
            )}
          </div>
        );
      })}

      <div style={{ padding:16, marginTop:"auto", borderTop:`1px solid ${C.border}` }}>
        <button onClick={resetSpell} style={{ width:"100%", background:"transparent",
          border:`1px solid ${C.border}`, borderRadius:8, padding:"8px", color:C.textMid,
          fontSize:9, cursor:"pointer", letterSpacing:2, fontFamily:"monospace" }}>
          CLEAR ALL
        </button>
      </div>
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
function MobileNav({ activeSecs, active, setActive, values, filled, quality, view, setView }) {
  return (
    <div style={{ display:"flex", background:C.surface, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
      <div style={{ display:"flex", gap:6, padding:"10px 16px", overflowX:"auto" }}>
        {activeSecs.map((sec, i) => {
          const val = values[sec.id]?.trim();
          const isActive = view==="builder" && active===i;
          return (
            <button key={sec.id} onClick={() => { setActive(i); setView("builder"); }}
              style={{ padding:"5px 12px", borderRadius:20, flexShrink:0, display:"flex", alignItems:"center", gap:4,
                background: isActive ? `${sec.color}18` : "transparent",
                border:`1px solid ${isActive ? sec.color+"44" : "transparent"}`,
                color: isActive ? sec.color : C.textMid,
                fontSize:9, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace" }}>
              <span style={{ color: val ? sec.color : C.textDim, fontSize:8 }}>{val?"●":"○"}</span>
              {sec.label.split(" ")[1]}
            </button>
          );
        })}
        {filled > 0 && (
          <button onClick={() => setView(v => v==="quality"?"builder":"quality")}
            style={{ padding:"5px 12px", borderRadius:20, flexShrink:0, display:"flex", alignItems:"center", gap:4,
              background: view==="quality" ? `${quality.verdictColor}18` : "transparent",
              border:`1px solid ${view==="quality" ? quality.verdictColor+"44" : "transparent"}`,
              color: view==="quality" ? quality.verdictColor : C.textMid,
              fontSize:9, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace" }}>
            <span style={{ fontFamily:"monospace", fontSize:8, fontWeight:"bold" }}>{quality.composite}</span>
            QUALITY
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BUILDER VIEW ─────────────────────────────────────────────────────────────
function BuilderView({ activeSecs, active, setActive, values, handleChange, showFinal,
  assembled, allReqFilled, filled, handleCast, handleCopy, copied, setSaveOpen, resetSpell, isImageMode, isMobile }) {

  const cur = activeSecs[Math.min(active, activeSecs.length-1)];

  const castStyle = (on) => ({
    padding:"14px 32px", borderRadius:12, fontSize:12, cursor: on?"pointer":"not-allowed",
    letterSpacing:2, fontFamily:"monospace", transition:"all 0.2s",
    background: on ? "linear-gradient(135deg,#7b6cf6,#c084fc)" : C.surface2,
    border:`1px solid ${on?"transparent":C.border2}`,
    color: on ? "#fff" : C.textMid,
    boxShadow: on ? "0 4px 20px rgba(167,139,250,0.3)" : "none",
  });

  return (
    <div style={{ padding: isMobile?"20px 16px":"36px 48px", maxWidth:800,
      margin:"0 auto", width:"100%", boxSizing:"border-box" }}>

      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10, color:cur.color, letterSpacing:3, fontFamily:"monospace", marginBottom:6 }}>
          {cur.number} — {cur.description.toUpperCase()}
        </div>
        <div style={{ fontSize:isMobile?22:28, color:cur.color, marginBottom:6, letterSpacing:"-0.5px" }}>{cur.label}</div>
        <div style={{ fontSize:14, color:C.textMid }}>{cur.prompt}</div>
      </div>

      <div style={{ fontSize:12, color:`${cur.color}bb`, lineHeight:1.6, padding:"10px 14px",
        background:`${cur.color}0a`, borderRadius:8, border:`1px solid ${cur.color}20`, marginBottom:20 }}>
        <span style={{ fontFamily:"monospace", fontSize:9, letterSpacing:2 }}>TIP  </span>{cur.tip}
        {cur.optional && <span style={{ marginLeft:8, fontFamily:"monospace", fontSize:9, color:C.textDim }}>(OPTIONAL)</span>}
      </div>

      <textarea
        value={values[cur.id]||""}
        onChange={e => handleChange(cur.id, e.target.value)}
        placeholder={cur.placeholder}
        rows={7}
        style={{ width:"100%", background:C.surface2, borderRadius:12, padding:"18px 20px",
          color:C.text, fontSize:14, lineHeight:1.8, resize:"vertical", minHeight:160,
          outline:"none", fontFamily:"Georgia, serif", boxSizing:"border-box", transition:"border-color 0.2s",
          border:`1px solid ${values[cur.id]?.trim() ? cur.color+"66" : C.border2}` }}
        onFocus={e => { e.target.style.borderColor=cur.color; }}
        onBlur={e => { e.target.style.borderColor=values[cur.id]?.trim()?cur.color+"66":C.border2; }}
      />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20 }}>
        <button onClick={() => setActive(Math.max(0,active-1))} disabled={active===0}
          style={ghostBtn({ fontSize:10, opacity:active===0?0.3:1, cursor:active===0?"not-allowed":"pointer" })}>
          ← PREV
        </button>
        <div style={{ display:"flex", gap:6 }}>
          {activeSecs.map((s,i) => (
            <div key={s.id} onClick={() => setActive(i)}
              style={{ width:6, height:6, borderRadius:"50%", cursor:"pointer", transition:"all 0.2s",
                background: values[s.id]?.trim() ? s.color : (i===active ? C.textMid : C.border2) }} />
          ))}
        </div>
        {active < activeSecs.length-1
          ? <button onClick={() => setActive(active+1)} style={ghostBtn({ fontSize:10 })}>NEXT →</button>
          : <button onClick={allReqFilled?handleCast:undefined} style={castStyle(allReqFilled)}>
              {allReqFilled?"CAST SPELL ✦":"FILL REQUIRED"}
            </button>
        }
      </div>

      {allReqFilled && active < activeSecs.length-1 && (
        <div style={{ marginTop:16, textAlign:"center" }}>
          <button onClick={handleCast} style={castStyle(true)}>CAST SPELL ✦</button>
        </div>
      )}

      {showFinal && (
        <div style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:14, padding:24, marginTop:32 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:9, letterSpacing:3, color:C.textMid, fontFamily:"monospace" }}>YOUR ASSEMBLED PROMPT</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setSaveOpen(true)} style={ghostBtn({ padding:"6px 14px", fontSize:9 })}>SAVE TO CODEX ◈</button>
              <button onClick={handleCopy} style={primaryBtn({ padding:"6px 16px", fontSize:9 })}>
                {copied?"COPIED ✓":"COPY ✦"}
              </button>
            </div>
          </div>
          <div style={{ fontSize:13, color:"#b0acaa", lineHeight:2, whiteSpace:"pre-wrap", fontFamily:"Georgia, serif" }}>{assembled}</div>
          <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:11, color:C.textMid }}>{filled} layer{filled!==1?"s":""} · {assembled.length} characters</div>
            <button onClick={resetSpell} style={ghostBtn({ padding:"6px 14px", fontSize:9 })}>NEW SPELL</button>
          </div>
        </div>
      )}

      {isImageMode && (
        <div style={{ marginTop:16, padding:"8px 14px", background:`${C.pink}0a`,
          border:`1px solid ${C.pink}22`, borderRadius:8, fontSize:11, color:C.pink, fontFamily:"monospace", letterSpacing:1 }}>
          ◈ IMAGE MODE — layers assembled for generative AI
        </div>
      )}
    </div>
  );
}

// ─── QUALITY VIEW ─────────────────────────────────────────────────────────────
function QualityView({ quality, activeSecs, allReqFilled, isMobile, setActive, setView, handleCast }) {
  return (
    <div style={{ padding:isMobile?"20px 16px":"36px 48px", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, letterSpacing:3, color:C.textMid, fontFamily:"monospace", marginBottom:6 }}>SPELL ANALYSIS</div>
        <div style={{ fontSize:isMobile?22:28, color:C.text, marginBottom:6, letterSpacing:"-0.5px" }}>Quality Checker</div>
        <div style={{ fontSize:13, color:C.textMid }}>A real-time score across four dimensions. Improve any layer to watch it change.</div>
      </div>

      <div style={{ background:quality.verdictBg, border:`1px solid ${quality.verdictBorder}`, borderRadius:16, padding:"24px 26px", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:3, color:quality.verdictColor, fontFamily:"monospace", marginBottom:8 }}>PROMPT QUALITY SCORE</div>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:48, fontWeight:"bold", color:quality.verdictColor, fontFamily:"monospace", lineHeight:1 }}>{quality.composite}</div>
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
            <text x="38" y="43" textAnchor="middle" fill={quality.verdictColor} fontSize="13" fontFamily="monospace" fontWeight="bold">{quality.composite}</text>
          </svg>
        </div>
        <div style={{ height:4, background:C.border, borderRadius:2, marginBottom:14, overflow:"hidden" }}>
          <div style={{ width:`${quality.composite}%`, height:"100%", background:`linear-gradient(90deg,${quality.verdictColor}88,${quality.verdictColor})`, borderRadius:2, transition:"width 0.8s ease" }}/>
        </div>
        <div style={{ fontSize:13, color:"#8a8aa8", lineHeight:1.8, fontStyle:"italic" }}>"{quality.advice}"</div>
      </div>

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
              <button onClick={() => { const idx=activeSecs.findIndex(sec=>sec.id===s.id); if(idx>=0){setActive(idx);setView("builder");} }}
                style={{ marginTop:10, background:"none", border:`1px solid ${col}33`, borderRadius:6,
                  padding:"4px 10px", color:col, fontSize:8, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace" }}>
                EDIT LAYER →
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:12, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ fontSize:9, letterSpacing:3, color:C.textMid, fontFamily:"monospace", marginBottom:10 }}>WHAT TO DO NEXT</div>
        {quality.composite < 82
          ? [...quality.scores].sort((a,b)=>a.raw-b.raw).slice(0,2).map(s => {
              const col = s.raw>=60?"#fbbf24":"#fb923c";
              return (
                <div key={s.id} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ color:col, fontSize:14, flexShrink:0, marginTop:1 }}>↑</span>
                  <div>
                    <div style={{ fontSize:12, color:C.text, marginBottom:3 }}>Improve <span style={{ color:col }}>{s.label}</span> ({s.raw}/100)</div>
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

      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <button onClick={() => setView("builder")} style={ghostBtn()}>← BACK TO BUILDER</button>
        {allReqFilled && (
          <button onClick={() => { handleCast(); setView("builder"); }} style={primaryBtn()}>CAST SPELL ✦</button>
        )}
      </div>
    </div>
  );
}

// ─── CODEX PANEL ─────────────────────────────────────────────────────────────
function CodexPanel({ codexCat, setCodexCat, mySpells, deleteMySpell, loadSpell, setCodexOpen, isMobile }) {
  const allCats  = ["My Spells", ...Object.keys(DEFAULT_CODEX)];
  const spells   = codexCat==="My Spells" ? mySpells : DEFAULT_CODEX[codexCat]||[];
  const catColor = codexCat==="My Spells" ? C.gold : CAT_COLORS[codexCat]||C.purple;
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setCodexOpen(false); };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [setCodexOpen]);

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:40, pointerEvents:"none" }} />
      <div ref={panelRef} style={{ position:"fixed", top:0, right:0, bottom:0,
        width:isMobile?"100vw":520, background:C.surface, borderLeft:`1px solid ${C.border2}`,
        zIndex:50, display:"flex", flexDirection:"column", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>

        <div style={{ padding:"24px 28px 18px", borderBottom:`1px solid ${C.border}`,
          display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:4, color:C.purple, fontFamily:"monospace", marginBottom:4 }}>REFERENCE LIBRARY</div>
            <div style={{ fontSize:22, color:C.text, fontStyle:"italic" }}>◈ The Codex</div>
            <div style={{ fontSize:12, color:C.textMid, marginTop:4 }}>Click any spell to load it into the builder.</div>
          </div>
          <button onClick={() => setCodexOpen(false)}
            style={{ background:"none", border:"none", color:C.textMid, fontSize:20, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0 }}>
          {allCats.map(cat => (
            <button key={cat} onClick={() => setCodexCat(cat)} style={{
              background:"none", border:"none", padding:"12px 16px", cursor:"pointer",
              borderBottom: codexCat===cat ? `2px solid ${cat==="My Spells"?C.gold:CAT_COLORS[cat]}` : "2px solid transparent",
              color: codexCat===cat ? (cat==="My Spells"?C.gold:CAT_COLORS[cat]) : C.textMid,
              fontSize:9, letterSpacing:1.5, fontFamily:"monospace", whiteSpace:"nowrap", flexShrink:0 }}>
              {cat==="My Spells" ? `✦ MY SPELLS (${mySpells.length})` : cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {spells.length===0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:16 }}>◈</div>
              <div style={{ fontSize:14, color:C.textMid, lineHeight:1.8 }}>Your Codex is empty.<br/>Cast a spell and save it here.</div>
            </div>
          ) : spells.map((entry, i) => (
            <div key={i} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:12,
              padding:"18px 20px", marginBottom:12, cursor:"pointer", transition:"all 0.2s", position:"relative" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=`${catColor}55`; e.currentTarget.style.background="#16162a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.surface2; }}>
              {codexCat==="My Spells" && (
                <button onClick={e => { e.stopPropagation(); deleteMySpell(i); }}
                  style={{ position:"absolute", top:14, right:14, background:"none", border:"none", color:C.textDim, fontSize:14, cursor:"pointer", padding:2 }}>✕</button>
              )}
              <div onClick={() => loadSpell(entry)}>
                <div style={{ fontSize:14, color:C.text, marginBottom:4, paddingRight:24, fontStyle:"italic" }}>{entry.title}</div>
                {entry.description && <div style={{ fontSize:12, color:C.textMid, marginBottom:10 }}>{entry.description}</div>}
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                  {SECTIONS.filter(s => entry.spell?.[s.id]?.trim()).map(s => (
                    <div key={s.id} style={{ background:C.bg, border:`1px solid ${s.color}30`, borderRadius:10,
                      padding:"2px 10px", fontSize:8, color:s.color, letterSpacing:1, fontFamily:"monospace" }}>{s.label}</div>
                  ))}
                </div>
                <div style={{ padding:"10px 12px", background:C.bg, borderRadius:8, borderLeft:`2px solid ${catColor}44` }}>
                  <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7, fontFamily:"monospace" }}>
                    {(entry.spell?.voice||entry.spell?.anchor||"").slice(0,90)}…
                  </div>
                </div>
                <div style={{ marginTop:10, fontSize:8, color:catColor, letterSpacing:2, fontFamily:"monospace" }}>LOAD INTO BUILDER →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── SAVE MODAL ───────────────────────────────────────────────────────────────
function SaveModal({ saveForm, setSaveForm, handleSave, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:60,
      backdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:16,
        padding:28, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:9, letterSpacing:3, color:C.purple, fontFamily:"monospace", marginBottom:4 }}>SAVE TO CODEX</div>
        <div style={{ fontSize:20, color:C.text, fontStyle:"italic", marginBottom:20 }}>◈ Name Your Spell</div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:C.textMid, letterSpacing:2, fontFamily:"monospace", marginBottom:6, display:"block" }}>SPELL TITLE</label>
          <input value={saveForm.title} onChange={e => setSaveForm(f=>({...f,title:e.target.value}))}
            placeholder="My Research Brief" autoFocus
            style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:10,
              padding:"12px 14px", color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:C.textMid, letterSpacing:2, fontFamily:"monospace", marginBottom:6, display:"block" }}>DESCRIPTION (OPTIONAL)</label>
          <input value={saveForm.description} onChange={e => setSaveForm(f=>({...f,description:e.target.value}))}
            placeholder="What this spell is for…"
            style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:10,
              padding:"12px 14px", color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:10, color:C.textMid, letterSpacing:2, fontFamily:"monospace", marginBottom:6, display:"block" }}>CATEGORY</label>
          <select value={saveForm.category} onChange={e => setSaveForm(f=>({...f,category:e.target.value}))}
            style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:10,
              padding:"12px 14px", color:C.text, fontSize:13, fontFamily:"Georgia,serif", outline:"none", boxSizing:"border-box" }}>
            <option>Language Models</option>
            <option>Image Generation</option>
          </select>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={ghostBtn()}>CANCEL</button>
          <button onClick={handleSave} disabled={!saveForm.title.trim()}
            style={primaryBtn({ flex:1, opacity:saveForm.title.trim()?1:0.5 })}>SAVE ◈</button>
        </div>
      </div>
    </div>
  );
}

// ─── INTRO SCREEN ─────────────────────────────────────────────────────────────
function IntroScreen({ onDone }) {
  const canvasRef   = useRef(null);
  const titleRef    = useRef(null);
  const animRef     = useRef(null);
  const runesRef    = useRef([]);
  const [phase, setPhase]             = useState("runes"); // runes → dissolve → title → arc → done
  const [titleOpacity, setTitleOp]    = useState(0);
  const [titleScale,   setTitleSc]    = useState(0.88);
  const [subOpacity,   setSubOp]      = useState(0);
  const [arcProgress,  setArcProg]    = useState(0);  // 0 → 1: arc sweeps across
  const [dotVisible,   setDotVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;

    // ── Spawn runes in orbiting rings ────────────────────────────────────────
    const count = 65;
    runesRef.current = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const r     = 70 + Math.random() * 230;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        glyph: RUNES[Math.floor(Math.random() * RUNES.length)],
        size: 13 + Math.random() * 22,
        opacity: 0,
        angle,
        orbitR: r,
        orbitSpeed: 0.004 + Math.random() * 0.007,
        color: ["#a78bfa","#f472b6","#34d399","#60a5fa","#fb923c","#fbbf24","#e8e4d9"][Math.floor(Math.random()*7)],
        phase: Math.random() * Math.PI * 2,
        dissolved: false,
      };
    });

    let t = 0;
    let dissolveStarted = false;
    let dissolveT = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#08080e";
      ctx.fillRect(0, 0, W, H);
      t += 1;

      if (t > 120 && !dissolveStarted) {
        dissolveStarted = true;
        setTimeout(() => setPhase("dissolve"), 0);
      }
      if (dissolveStarted) dissolveT += 1;

      let allDissolved = true;
      runesRef.current.forEach((rune, i) => {
        if (!dissolveStarted) {
          rune.opacity = Math.min(1, rune.opacity + 0.022);
          rune.angle  += rune.orbitSpeed;
          rune.x = cx + Math.cos(rune.angle) * rune.orbitR;
          rune.y = cy + Math.sin(rune.angle) * rune.orbitR;
          rune.y += Math.sin(t * 0.04 + rune.phase) * 0.45;
        } else {
          const delay = i * 2.8;
          if (dissolveT > delay) {
            rune.x      += (cx - rune.x) * 0.055;
            rune.y      += (cy - rune.y) * 0.055;
            rune.opacity = Math.max(0, rune.opacity - 0.022);
            rune.size   *= 0.988;
            if (rune.opacity <= 0) rune.dissolved = true;
          }
          if (!rune.dissolved) allDissolved = false;
        }

        if (rune.dissolved) return;
        ctx.save();
        ctx.globalAlpha   = rune.opacity;
        ctx.fillStyle     = rune.color;
        ctx.font          = `${rune.size}px serif`;
        ctx.textAlign     = "center";
        ctx.textBaseline  = "middle";
        ctx.shadowColor   = rune.color;
        ctx.shadowBlur    = rune.opacity * 14;
        ctx.fillText(rune.glyph, rune.x, rune.y);
        ctx.restore();
      });

      if (dissolveStarted && allDissolved) {
        cancelAnimationFrame(animRef.current);
        // Title fade in
        setTimeout(() => {
          setPhase("title");
          let op = 0, sc = 0.88;
          const ti = setInterval(() => {
            op = Math.min(1, op + 0.032);
            sc = Math.min(1, sc + 0.007);
            setTitleOp(op);
            setTitleSc(sc);
            if (op >= 1) {
              clearInterval(ti);
              // Subtitle fade, then arc
              setTimeout(() => {
                setSubOp(1);
                setTimeout(() => {
                  setPhase("arc");
                  // Animate arc from 0 → 1 over ~900ms
                  let prog = 0;
                  const arcInt = setInterval(() => {
                    prog = Math.min(1, prog + 0.018);
                    setArcProg(prog);
                    if (prog >= 1) {
                      clearInterval(arcInt);
                      setDotVisible(true);
                      // Brief pause then done
                      setTimeout(() => onDone(), 900);
                    }
                  }, 16);
                }, 500);
              }, 300);
            }
          }, 16);
        }, 80);
        return;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Arc path: a sweeping curve that ends at the dot on the "i" ─────────────
  // The word "Wizards" — the dot lands roughly above the "i" in "Wizards"
  // We draw this in SVG overlay, animating strokeDashoffset
  const ARC_LEN = 1200; // total path length estimate

  return (
    <div style={{ position:"fixed", inset:0, background:"#08080e", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>

      <canvas ref={canvasRef} style={{ position:"absolute", inset:0 }} />

      {/* Title + arc overlay */}
      {(phase === "title" || phase === "arc" || phase === "done") && (
        <div style={{ position:"relative", zIndex:10, textAlign:"center", userSelect:"none" }}>

          {/* SVG arc — sweeps from left edge of screen, curves down and ends at the dot on "i" */}
          {phase === "arc" || phase === "done" ? (
            <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%",
              overflow:"visible", pointerEvents:"none" }}
              viewBox="0 0 800 80">
              {/* Arc path: starts far left, curves up then descends to dot above "i" in "Wizards"
                  "Wizards" starts at ~x=0 in the text block. The "i" is ~5th char.
                  We position endpoint at roughly x=88, y=2 (above the title text top) */}
              <defs>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0"/>
                  <stop offset="40%"  stopColor="#f472b6" stopOpacity="1"/>
                  <stop offset="80%"  stopColor="#fbbf24" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="1"/>
                </linearGradient>
                <filter id="arcGlow">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              {/* The sweeping arc path */}
              <path
                d="M -300,40 C -100,-60 200,-80 295,4"
                fill="none"
                stroke="url(#arcGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#arcGlow)"
                style={{
                  strokeDasharray: ARC_LEN,
                  strokeDashoffset: ARC_LEN * (1 - arcProgress),
                  transition:"none",
                }}
              />
              {/* Travelling glow head */}
              {arcProgress > 0.05 && arcProgress < 1 && (
                <circle r="4" fill="#ffffff" filter="url(#arcGlow)" style={{ opacity: 0.9 }}>
                  <animateMotion
                    dur="0.01s"
                    repeatCount="1"
                    path="M -300,40 C -100,-60 200,-80 295,4"
                    keyPoints={`${Math.max(0, arcProgress - 0.01)};${arcProgress}`}
                    keyTimes="0;1"
                    calcMode="linear"
                    fill="freeze"
                  />
                </circle>
              )}
            </svg>
          ) : null}

          {/* Title text */}
          <div ref={titleRef} style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            transition:"none",
            position:"relative",
          }}>
            {/* The dot on the "i" — appears when arc lands */}
            {dotVisible && (
              <div style={{
                position:"absolute",
                // Positioned above the "i" in "Wizards" — roughly 23% from left of text block
                left:"23.5%", top:"-14px",
                width:7, height:7, borderRadius:"50%",
                background:"#ffffff",
                boxShadow:"0 0 8px 3px #a78bfa, 0 0 20px 6px #f472b633",
                animation:"dotPulse 0.6s ease-out forwards",
              }}/>
            )}

            <div style={{
              fontSize:"clamp(32px,5.5vw,68px)",
              color:"#e8e4d9",
              letterSpacing:"-1.5px",
              fontStyle:"italic",
              fontFamily:"Georgia,serif",
              textShadow:"0 0 40px rgba(167,139,250,0.5), 0 0 80px rgba(167,139,250,0.2)",
              marginBottom:10,
              lineHeight:1.15,
            }}>
              ⚗️ Wizards Studio
            </div>

            <div style={{
              opacity: subOpacity,
              transition:"opacity 0.8s ease",
              fontSize:"clamp(10px,1.3vw,13px)",
              color:"#5a5a7a",
              letterSpacing:5,
              fontFamily:"monospace",
              textTransform:"uppercase",
            }}>
              Words are spells. Your prompts should be too.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotPulse {
          0%   { transform:scale(0); opacity:0; box-shadow:0 0 0px 0px #a78bfa; }
          50%  { transform:scale(1.8); opacity:1; box-shadow:0 0 16px 8px #a78bfa88; }
          100% { transform:scale(1); opacity:1; box-shadow:0 0 8px 3px #a78bfa, 0 0 20px 6px #f472b633; }
        }
      `}</style>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PromptStudio() {
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const k = e => { if (e.key==="Escape") { setCodexOpen(false); setSaveOpen(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const isImageMode  = detectImageMode(values);
  const activeSecs   = isImageMode ? IMAGE_SECTIONS : SECTIONS;
  const filled       = activeSecs.filter(s => values[s.id]?.trim()).length;
  const allReqFilled = activeSecs.filter(s=>!s.optional).every(s => values[s.id]?.trim());
  const progress     = (filled/activeSecs.length)*100;
  const assembled    = isImageMode
    ? activeSecs.filter(s=>values[s.id]?.trim()).map(s=>values[s.id].trim()).join(", ")
    : activeSecs.filter(s=>values[s.id]?.trim()).map(s=>values[s.id].trim()).join("\n\n");
  const quality = useMemo(() => scorePrompt(values, assembled, isImageMode), [assembled, isImageMode]);

  const showToast = (msg, color=C.green) => { setToast({msg,color}); setTimeout(()=>setToast(null),2400); };
  const handleChange = (id, val) => setValues(v => ({...v,[id]:val}));

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
    setSaveOpen(false); setView("builder"); castRef.current=false;
  };

  const loadSpell = (entry) => {
    clearTimeout(saveTimerRef.current);
    const merged = {};
    SECTIONS.forEach(s => { merged[s.id]=entry.spell?.[s.id]||""; });
    setValues(merged); setCodexOpen(false); setActive(0);
    setShowFinal(false); setSaveOpen(false); setView("builder"); castRef.current=false;
  };

  const handleSave = () => {
    if (!saveForm.title.trim()) return;
    const spell = {};
    SECTIONS.forEach(s => { spell[s.id]=values[s.id]||""; });
    const entry = { title:saveForm.title, description:saveForm.description, category:saveForm.category, spell, savedAt:Date.now() };
    const updated = [entry,...mySpells];
    setMySpells(updated); saveSpells(updated);
    setSaveOpen(false); setSaveForm({title:"",description:"",category:"Language Models"});
    showToast("Saved to Codex ◈");
  };

  const deleteMySpell = i => {
    const updated = mySpells.filter((_,j)=>j!==i);
    setMySpells(updated); saveSpells(updated);
  };

  return (
    <>
      {intro && <IntroScreen onDone={() => setIntro(false)} />}
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Georgia,serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        *{box-sizing:border-box;}
        textarea::placeholder,input::placeholder{color:#30303e;}
        textarea:focus,input:focus{outline:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:2px;}
        select option{background:#13131f;}
      `}</style>

      {/* NAV */}
      <nav style={{ height:52, background:C.surface, borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 24px", flexShrink:0, position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18, color:C.purple }}>⚗️</span>
          <div>
            <div style={{ fontSize:16, color:C.text, fontStyle:"italic", letterSpacing:"-0.3px" }}>Wizards Studio</div>
            <div style={{ fontSize:9, color:C.textMid, letterSpacing:3, fontFamily:"monospace", marginTop:1 }}>BY WIZARDS PLAYGROUND</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {filled > 0 && (
            <button onClick={() => setView(v=>v==="quality"?"builder":"quality")}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, cursor:"pointer",
                background: view==="quality" ? `${quality.verdictColor}15` : "transparent",
                border:`1px solid ${view==="quality" ? quality.verdictColor+"44" : C.border}`,
                transition:"all 0.2s" }}>
              <div style={{ width:24, height:24, position:"relative", flexShrink:0 }}>
                <svg width="24" height="24" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="12" cy="12" r="9" fill="none" stroke={C.border2} strokeWidth="3"/>
                  <circle cx="12" cy="12" r="9" fill="none" stroke={quality.verdictColor} strokeWidth="3"
                    strokeDasharray={`${Math.round(quality.composite/100*56.5)} 56.5`}
                    strokeLinecap="round" style={{ transition:"stroke-dasharray 0.5s ease" }}/>
                </svg>
                <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:7, fontFamily:"monospace", color:quality.verdictColor, fontWeight:"bold" }}>
                  {quality.composite}
                </span>
              </div>
              <span style={{ fontSize:9, fontFamily:"monospace", letterSpacing:1, color:view==="quality"?quality.verdictColor:C.textMid }}>QUALITY</span>
            </button>
          )}
          <button onClick={() => setCodexOpen(true)}
            style={{ background:codexOpen?C.surface2:"transparent", border:`1px solid ${codexOpen?C.border2:"transparent"}`,
              borderRadius:8, padding:"6px 14px", color:codexOpen?C.text:C.textMid,
              fontSize:10, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace" }}>
            ◈ CODEX
          </button>
          {allReqFilled && view==="builder" && !showFinal && (
            <button onClick={handleCast}
              style={{ background:"transparent", border:`1px solid ${C.purple}44`, borderRadius:8,
                padding:"6px 14px", color:C.purple, fontSize:10, cursor:"pointer", letterSpacing:1.5, fontFamily:"monospace" }}>
              CAST ✦
            </button>
          )}
        </div>
      </nav>

      {/* MOBILE NAV — only shown on mobile */}
      {isMobile && (
        <MobileNav activeSecs={activeSecs} active={active} setActive={setActive}
          values={values} filled={filled} quality={quality} view={view} setView={setView} />
      )}

      {/* PROGRESS BAR */}
      <div style={{ height:2, background:C.border, flexShrink:0 }}>
        <div style={{ width:`${progress}%`, height:"100%", transition:"width 0.4s",
          background:`linear-gradient(90deg,${activeSecs[Math.min(active,activeSecs.length-1)].color}88,${activeSecs[Math.min(active,activeSecs.length-1)].color})` }} />
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 54px)" }}>

        {/* SIDEBAR — only shown on desktop */}
        {!isMobile && (
          <Sidebar activeSecs={activeSecs} active={active} setActive={setActive}
            values={values} filled={filled} progress={progress} quality={quality}
            view={view} setView={setView} resetSpell={resetSpell} />
        )}

        <div style={{ flex:1, overflowY:"auto" }}>
          {view==="quality"
            ? <QualityView quality={quality} activeSecs={activeSecs} allReqFilled={allReqFilled}
                isMobile={isMobile} setActive={setActive} setView={setView} handleCast={handleCast} />
            : <BuilderView activeSecs={activeSecs} active={active} setActive={setActive}
                values={values} handleChange={handleChange} showFinal={showFinal}
                assembled={assembled} allReqFilled={allReqFilled} filled={filled}
                handleCast={handleCast} handleCopy={handleCopy} copied={copied}
                setSaveOpen={setSaveOpen} resetSpell={resetSpell} isImageMode={isImageMode} isMobile={isMobile} />
          }
        </div>
      </div>

      {/* OVERLAYS */}
      {codexOpen && (
        <CodexPanel codexCat={codexCat} setCodexCat={setCodexCat} mySpells={mySpells}
          deleteMySpell={deleteMySpell} loadSpell={loadSpell} setCodexOpen={setCodexOpen} isMobile={isMobile} />
      )}
      {saveOpen && (
        <SaveModal saveForm={saveForm} setSaveForm={setSaveForm} handleSave={handleSave} onClose={() => setSaveOpen(false)} />
      )}
      {toast && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          background:C.surface, border:`1px solid ${toast.color}44`, borderRadius:10, padding:"10px 20px",
          fontSize:12, color:toast.color, fontFamily:"monospace", letterSpacing:1,
          zIndex:100, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
    </>
  );
}
