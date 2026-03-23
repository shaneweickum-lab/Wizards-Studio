// ─── IMAGE MODE DETECTION ─────────────────────────────────────────────────────
// Returns true if values or loadedSpellCategory indicate image generation mode.

const IMAGE_SIGNALS = [
  "aspect ratio","photorealistic","bokeh","depth of field","35mm","film grain",
  "portrait","landscape","render","illustration","cinematic","shot on","lighting",
  "composition","palette","texture","mid-journey","midjourney","stable diffusion",
  "dall-e","dalle","flux","firefly","4k","8k","hyperrealistic","oil painting",
  "watercolor","watercolour","pixel art","concept art","diffusion","negative prompt",
];

export function detectImageMode(values, loadedSpellCategory) {
  if (loadedSpellCategory === "Image Generation") return true;
  const allText = Object.values(values).join(" ").toLowerCase();
  const hits = IMAGE_SIGNALS.filter(s => allText.includes(s)).length;
  const anchorEmpty = !(values.anchor || "").trim();
  const voiceText = (values.voice || "").toLowerCase();
  const voiceVisual = ["portrait","scene","landscape","shot","lighting","composition","colour","color","render"]
    .some(w => voiceText.includes(w));
  return hits >= 2 || (anchorEmpty && voiceVisual && hits >= 1);
}
