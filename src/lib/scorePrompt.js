// ─── PROMPT QUALITY SCORER ────────────────────────────────────────────────────
// Pure function — takes layer values, assembled text, and imageMode flag.
// Returns scores, composite (0-100), verdict, and advice.

const VAGUE_WORDS = [
  "something","stuff","things","good","nice","better","great","help",
  "maybe","perhaps","kind of","sort of","etc","somehow",
];
const POWER_WORDS = [
  "exactly","specifically","always","never","must","only","precisely","ensure",
  "avoid","format","structure","output","return","write","analyse","analyze",
  "generate","create","list","explain","compare","rewrite","summarise","summarize",
];
const FORMAT_SIGNALS = [
  "format","length","words","sentences","paragraphs","bullet","numbered","list",
  "json","table","structure","tone","short","long","brief","concise","detailed",
  "return","output","write in","respond in","avoid","no ","don't","never",
];

function wordCount(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export function scorePrompt(vals, assembledText, imageMode = false) {
  const v = id => (vals[id] || "").trim();
  const scores = [];

  // Completeness (30%)
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

  // Specificity (25%)
  const lower = assembledText.toLowerCase();
  const vagueCount = VAGUE_WORDS.filter(w => lower.includes(w)).length;
  const powerCount = POWER_WORDS.filter(w => lower.includes(w)).length;
  scores.push({
    id:"specificity", label:"Specificity", icon:"◎", weight:25,
    raw: Math.max(0, Math.min(100, 50 + (powerCount*8) - (vagueCount*15))),
    detail: vagueCount > 2
      ? `${vagueCount} vague words detected (${VAGUE_WORDS.filter(w=>lower.includes(w)).slice(0,3).join(", ")}). Replace with precise language.`
      : powerCount >= 3 ? "Strong action language detected. Prompt gives clear, directive instructions."
      : "Reasonably specific. More action verbs would sharpen it.",
  });

  // Depth (25%)
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

  // Output Format (20%)
  const constraintText = v("constraint").toLowerCase();
  const formatCount = FORMAT_SIGNALS.filter(s => constraintText.includes(s)).length;
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
