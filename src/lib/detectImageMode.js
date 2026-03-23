// ─── IMAGE MODE DETECTION ─────────────────────────────────────────────────────
// Pure function — takes layer values object, returns true if image mode is active.
// Image mode activates when 2+ visual generation signals are detected in the text.

const IMAGE_SIGNALS = [
  "aspect ratio","photorealistic","bokeh","depth of field","35mm","film grain",
  "portrait","render","illustration","cinematic","shot on","lighting","composition",
  "palette","texture","midjourney","stable diffusion","dall-e","dalle","flux","4k","8k",
  "hyperrealistic","oil painting","watercolor","pixel art","concept art","diffusion","negative prompt",
];

export function detectImageMode(values) {
  const all = Object.values(values).join(" ").toLowerCase();
  return IMAGE_SIGNALS.filter(s => all.includes(s)).length >= 2;
}
