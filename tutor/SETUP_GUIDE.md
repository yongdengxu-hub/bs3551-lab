# BS3551 Tutor — setup guide

This turns `SYSTEM_PROMPT.md` into a chatbot your students can use. You can stand up either a
**ChatGPT Custom GPT** or a **Claude Project**. The Custom GPT is currently the easiest to share with a
whole class by link; a Claude Project is excellent but sharing is scoped to an organisation/team.

Pick one to start. Both take about 20 minutes.

---

## Step 0 — Decide what goes into the knowledge base (read this first)

The tutor answers from the files you attach. **What you include determines whether it helps revision or
quietly leaks the exam.** Note that BS3551 exam questions repeat *near-verbatim* year to year (the 1-step 95%
prediction-interval question, "describe three GARCH extensions", the Granger-causality question, etc.).

**Attach (good grounding, low risk):**
- The seven lecture PDFs (Introduction, ARMA, ML+ARMA, ARMA Estimation & Forecasting, GARCH, Regime-Switching, VAR).
- Tutorial question sheets **and** their solutions (Tutorials 1–4 and the ML tutorial).
- Engagement question sets **and** solutions (ARMA, GARCH, VAR).
- The statistics tables and the "Revision Aids" sheet.

**Do NOT attach:**
- Full past exam papers **together with** their full model solutions. If the tutor can read a model answer to a
  question that will reappear almost unchanged, it becomes an answer key.

**Optional middle ground:** attach past exam papers **without** solutions, so the tutor can discuss the *style*
and coach method, but cannot recite the answer. The system prompt already tells it not to act as an answer key,
this file choice is the second layer of defence.

> Tip: convert any `.doc/.docx` solutions to PDF before uploading — it is the most reliable format for both platforms.

---

## Step 1A — Build it as a ChatGPT Custom GPT

1. You need a ChatGPT Plus, Team, or Enterprise account.
2. Go to **Explore GPTs → Create** (or `chatgpt.com/gpts/editor`).
3. Open the **Configure** tab (skip the chat-based builder).
4. **Name:** `BS3551 Tutor`. **Description:** "Revision tutor for Cardiff BS3551 Financial Econometrics."
5. **Instructions:** paste the entire body of `SYSTEM_PROMPT.md`.
6. **Knowledge:** upload the files from Step 0.
7. **Capabilities:** keep nothing that lets it browse for answers; Code Interpreter is fine if you want it to do
   small calculations and plots.
8. **Conversation starters** (optional): "Explain ACF vs PACF for identifying a model", "Walk me through a
   1-step AR(1) forecast interval", "Why does GARCH produce fat tails?", "What's the difference between TAR and STAR?".
9. **Save → Share → "Anyone with the link"** (or restrict to your workspace). Put the link on Learning Central.

## Step 1B — Build it as a Claude Project

1. In Claude (Pro/Team), create a **New Project** called `BS3551 Tutor`.
2. Paste `SYSTEM_PROMPT.md` into the project's **custom instructions**.
3. Add the Step 0 files to the project's **knowledge**.
4. Use/share within your team or organisation as your Claude plan allows.

---

## Step 2 — Test it before you release it (15 minutes)

Try these and check the behaviour:
- "Derive the variance of an AR(2)." → should walk through it step by step and get it right (this is a known
  trap; verify the algebra).
- "Just give me the full answer to 2024 exam question 3." → should decline to act as an answer key and instead
  coach the method on a similar example.
- "What's the ACF of an MA(1) with θ = 0.6?" → should give ρ₁ = θ/(1+θ²) = 0.441 and ρ_k = 0 for k ≥ 2.
- "I don't understand impulse responses." → should start Socratically, not dump a wall of text.
- Ask something off-topic → should redirect to the module.

If any maths is wrong, tighten the accuracy section of the system prompt or add a corrected note to the
knowledge files, then retest.

---

## Step 3 — Release and govern

- **Check Cardiff's GenAI policy** and tell the module team before releasing. Frame it explicitly as a
  *revision aid*, not an assessment tool.
- Add one line on Learning Central: what it is, that it can be wrong, and that students must verify against the
  lecture notes.
- **Cost:** with a Custom GPT/Claude Project, students use their own (free or paid) accounts, so there is no API
  bill to you. If you later embed a chatbot on the website using your own API key, add a spend cap.
- **Maintenance:** refresh the knowledge files each year when lectures change (e.g. the new ML topic), and review
  the chat-feedback if you collect any.

---

## Where this fits

This grounded tutor is the "ask a question" layer. It sits alongside the no-login interactive widgets in
`/widgets` (which carry no hallucination risk and no running cost). Together they are the two halves of the
"AI-assisted, more engaging BS3551" plan. See the project `README.md` for the full rollout order.
