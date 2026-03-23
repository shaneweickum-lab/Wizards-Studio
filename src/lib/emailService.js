// ─── EMAIL SERVICE ────────────────────────────────────────────────────────────
// Uses EmailJS (emailjs.com) — free tier: 200 emails/month, no backend needed.
// SETUP:
//   1. Sign up at https://emailjs.com
//   2. Create a Service (Gmail, Outlook, etc.)
//   3. Create two Email Templates:
//      WELCOME: variables → {{to_name}}, {{to_email}}, {{app_name}}, {{app_url}}
//      RESET:   variables → {{to_email}}, {{reset_code}}, {{reset_link}}, {{expiry}}
//   4. Replace the three YOUR_* values below with your real IDs

const EMAILJS = {
  serviceId:         "YOUR_SERVICE_ID",
  welcomeTemplateId: "YOUR_WELCOME_TEMPLATE_ID",
  resetTemplateId:   "YOUR_RESET_TEMPLATE_ID",
  publicKey:         "YOUR_PUBLIC_KEY",
};

export const EMAIL_CONFIGURED = !EMAILJS.serviceId.startsWith("YOUR");

async function sendEmailJS(templateId, params) {
  if (!EMAIL_CONFIGURED) {
    console.log("[EmailJS — not configured] Template:", templateId, "| Params:", params);
    return { ok: true, demo: true };
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:      EMAILJS.serviceId,
        template_id:     templateId,
        user_id:         EMAILJS.publicKey,
        template_params: params,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error("EmailJS send failed:", e);
    return { ok: false };
  }
}

export function sendWelcomeEmail(email, name) {
  return sendEmailJS(EMAILJS.welcomeTemplateId, {
    to_email: email,
    to_name:  name || email.split("@")[0],
    app_name: "Wizards Playground",
    app_url:  window.location.origin,
  });
}

export function sendResetEmail(email, token) {
  const link = `${window.location.origin}${window.location.pathname}?reset=${token}&email=${encodeURIComponent(email)}`;
  return sendEmailJS(EMAILJS.resetTemplateId, {
    to_email:   email,
    reset_code: token,
    reset_link: link,
    expiry:     "30 minutes",
    app_name:   "Wizards Playground",
  });
}
