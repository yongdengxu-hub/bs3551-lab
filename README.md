# BS3551 Interactive Lab

A small, no-cost, no-login website that makes the hardest parts of *BS3551 Financial Econometrics*
(Cardiff, third year) interactive, plus a grounded AI tutor that answers student questions from your own
notes. Built to sit beside the existing lectures, tutorials and engagements, not replace them.

## The idea in one line
**Two layers.** (1) Browser widgets that have zero hallucination risk and zero running cost, for the
concepts students reliably struggle with. (2) A chatbot grounded in your materials for open-ended "I don't
get this" questions. The widgets are the safe, high-engagement win; the tutor is the 24/7 help desk.

## What is in here

```
BS3551-AI-Lab/
├─ index.html                      Lab landing page (links every tool)
├─ assets/
│  ├─ styles.css                   Shared look (light/dark; edit --brand to rebrand)
│  └─ tslib.js                     Time-series maths, derived from first principles, shared by all widgets
├─ widgets/
│  ├─ acf-pacf-explorer.html       LIVE — AR/MA/ARMA fingerprints + "name that model" quiz   (Topic 2, exam Q1)
│  ├─ forecast-intervals.html      LIVE — multi-step AR forecasts + fanning 95% intervals     (Topic 2, exam Q2)
│  └─ lasso-vs-ols.html            LIVE — LASSO/Ridge shrinkage, sparsity, train-vs-test U    (Topic 6, exam Q5)
├─ tutor/
│  ├─ SYSTEM_PROMPT.md             Socratic tutor instructions to paste into a Custom GPT / Claude Project
│  └─ SETUP_GUIDE.md               How to stand it up + the exam-leakage file checklist
└─ README.md                       This file
```

Planned widgets (stubs shown on the landing page): GARCH volatility (Q3), regime switching TAR/STAR (Q4),
VAR & impulse responses (Q6). Each is one self-contained HTML file using the same
`assets/tslib.js` + `styles.css`, so adding one does not touch the others.

## Preview locally
Open `index.html` in a browser. The widgets pull Chart.js from a CDN, so you need an internet connection;
everything else is local. (If you prefer a local server: `python -m http.server` from this folder, then visit
`http://localhost:8000`.)

## Deploy to GitHub Pages (free, ~10 minutes)
1. Create a new GitHub repo, e.g. `bs3551-lab`.
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "BS3551 interactive lab: ACF/PACF + forecast widgets, AI tutor prompt"
   git branch -M main
   git remote add origin https://github.com/<you>/bs3551-lab.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / root → Save.**
4. After a minute the site is live at `https://<you>.github.io/bs3551-lab/`. Link it from Learning Central.

(Google Sites is *not* recommended for this — it blocks the custom JavaScript these widgets need. GitHub Pages
serves them as-is.)

## Suggested rollout order
1. **Now:** publish the two live widgets; link them from the ARMA tutorial. Lowest risk, immediate engagement.
2. **This term:** stand up the AI tutor as a Custom GPT (see `tutor/SETUP_GUIDE.md`); pilot with a willing
   tutorial group; collect informal feedback.
3. **Next:** build the GARCH widget (Q3); the LASSO/Ridge widget (Q5) is already live and supports the
   brand-new Topic 6, where students have no prior exposure.
4. **Later:** regime-switching and VAR widgets; optionally embed the tutor directly in the site via a small
   serverless function calling the Claude API (only worth it if the Custom-GPT pilot shows real demand).

## Design principles
- **Correct maths or nothing.** All quantities come from `tslib.js`, computed from first principles (MA(∞)
  ψ-weights → autocovariances → Durbin–Levinson PACF; ψ-weights → forecast-error variance). No per-model
  formulas typed by hand, which is exactly where slips creep in.
- **No login, no cost, no tracking** for the widgets. They are static files.
- **Hallucination is quarantined** to the tutor, which is grounded in your files and told to be Socratic and to
  flag uncertainty.
- **One source of truth per concept**, shared across widgets, so a fix propagates everywhere.

## Decisions still yours to make
- **Cardiff GenAI policy:** clear the tutor with the module team; release it as a revision aid.
- **Exam leakage:** because BS3551 questions repeat almost verbatim, do not feed full past-exam *solutions* into
  the tutor (see `tutor/SETUP_GUIDE.md`, Step 0). Consider refreshing a couple of exam questions each year.
- **Branding:** `--brand` in `styles.css` is set to a Cardiff claret; change it to match your preferred palette.
- **Known content fix:** your `Notes for 2026.txt` flags an AR(2) moments error in a lecture; the widgets derive
  moments correctly, so they can double as a check when you correct the slide.

---
Built as a starting scaffold. Everything here is meant to be edited.
