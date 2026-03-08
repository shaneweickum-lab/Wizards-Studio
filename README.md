# Wizards Studio

A focused prompt-building tool from Wizards Playground.
Includes the five-layer Spell Builder, the Codex library, and the Quality Checker.

---

## Deploy to Vercel (step by step)

### Step 1 — Create a GitHub account
Go to https://github.com and sign up if you don't have one.

### Step 2 — Create a new repository
1. Click the **+** icon in the top right → **New repository**
2. Name it `wizards-studio`
3. Set it to **Public** (required for Vercel free tier)
4. Click **Create repository**

### Step 3 — Upload this project
On the repository page, click **uploading an existing file** and drag in all files from this folder. Make sure you include:
- `index.html`
- `package.json`
- `vite.config.js`
- `.gitignore`
- `src/` folder (with `main.jsx` and `App.jsx` inside)

Click **Commit changes**.

### Step 4 — Connect to Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New → Project**
3. Find your `wizards-studio` repo and click **Import**
4. Vercel will auto-detect it as a Vite project — leave all settings as default
5. Click **Deploy**

Your live URL will appear in about 60 seconds (e.g. `wizards-studio.vercel.app`).

### Step 5 — Embed in Wix
1. In your Wix editor, add an **HTML iFrame** element (Add → Embed → HTML iFrame)
2. Click **Enter Code** and paste:
   ```html
   <iframe
     src="https://YOUR-PROJECT-NAME.vercel.app"
     width="100%"
     height="100%"
     style="border:none;"
   ></iframe>
   ```
3. Replace `YOUR-PROJECT-NAME` with your actual Vercel URL
4. Resize the iFrame element to fill the section

### Optional — Custom subdomain (e.g. studio.wizardsplayground.com)
1. In Vercel → your project → **Settings → Domains**
2. Add your custom subdomain
3. In your domain registrar (wherever you bought the domain), add a CNAME record:
   - Name: `studio`
   - Value: `cname.vercel-dns.com`
4. Takes 5–30 minutes to go live

---

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173
