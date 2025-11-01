# Greptalk — Repo Radio (Podcast Mode) MVP

**One-liner:** *“Talk to a repo as a podcast.”* Paste a GitHub URL and Greptalk (with Greptile) crafts a funny, 3–5 minute, two‑voice “code podcast” episode that explains the project, spotlights patterns, and pitches a tiny contribution—with file/line citations. Optional CTA: pay to open a PR for the pitched micro‑task.

---

## Why this MVP?
- **Instant wow:** Audio + humor + real code citations in under a minute feels magical.
- **Tiny scope:** One screen, one button, one episode per run.
- **Path to revenue:** Free episodes; paid “Create PR” from the episode’s task.

---

## Scope (v1)
- **Input:** Public GitHub repo URL.
- **Output:** MP3 audio + transcript markdown on the page.
- **Voices:** 2 characters — **Greptice** (dry concierge) & **Forky** (curious junior).
- **Language:** English only.
- **Runtime:** 3–5 minutes (500–800 words).
- **Grounding:** At least **3 file/line citations** from the repo (e.g., `src/server.ts: L42–L77`).

---

## UX (single screen)
1. **Field:** “Paste repo URL” → **Generate Episode**.
2. **Progress:** “Greptice is reading the repo…” (spinner).
3. **Result:**
   - Audio player (play/pause + download).
   - Transcript with inline citations and copyable snippets.
   - CTA: **“Open a PR for this episode’s task ($9)”** (can be stubbed initially).

---

## Episode Structure (beats)
1. **Cold open (10s):** quick joke about the repo concept (“Monorepo? More like mono-‘nope’-o…”).
2. **What is this? (40–60s):** purpose, stack, entrypoints (**cite files/lines**).
3. **Guided tour (60–90s):** 2–3 hotspots with why they matter (**cite**).
4. **Pattern spotlight (40–60s):** pick one (logging / errors / tests / config) with 1–2 examples (**cite**).
5. **Micro‑contribution pitch (45–75s):** a ≤90‑minute change; 5 steps + commands (**cite files to touch**).
6. **Outro (10–20s):** CTA to open a PR for $9; refund if closed as “not useful.”

**Tone rails:** punch concepts, not people; no profanity; keep it respectful and helpful.

---

## Output Contract
Every episode **must** include:
- **≥3 citations** using `path: Lstart–Lend` and only valid paths found via Greptile.
- **One micro‑task plan** with **5 concrete steps** + **shell commands**.
- **One pattern example** with a short, copyable snippet in the transcript.
- **Risk/Check list:** 2–3 bullets (tests, lint, edge cases).
- **Timebox label:** `<30m`, `30–90m`, or `>2h`.

If any of these are missing, **fail the run** and ask user to try another repo.

---

## Pipeline (Greptile → Script → Audio)
1. **Greptile fetch (minimal):**
   - Repo structure (top dirs/files).
   - Entrypoints (bootstrap files, `main`, `index`, server start).
   - 2–3 “hot files” by size/import centrality.
   - Pattern probes: “logging”, “error handling”, “tests”, “config” (grab example lines).
2. **Outline Builder (LLM):** fill the *Repo Outline* template with hard citations.
3. **Scriptwriter (LLM):** convert outline → dialogue with stage tags (`[SFX: ...]`), maintain cites.
4. **TTS (2 voices):** render Greptice (deadpan) & Forky (peppy); stitch; add intro/outro sting.
5. **Export:** MP3 + transcript (markdown). Normalize loudness lightly.

---

## Prompts & Templates

### A) Repo Outline Prompt (Greptile‑grounded)
**System role:** *You are Greptice, a helpful but dry repo concierge. Produce a factual outline for a 3–5 minute comedic podcast. Cite files/lines for every claim. Never invent paths.*

**Fill these sections:**
- **Purpose (1 sentence)**
- **Stack & Entrypoints (bullets)** with `path: L–L`
- **Three Hotspots** (name + why + `path: L–L`)
- **Pattern Spotlight** (pick one: logging/errors/tests/config) with 1–2 **examples** `path: L–L`
- **Micro‑Task (≤90 min)**
  - **Goal (1 line)**
  - **Steps (5 exact steps)** with **commands**
  - **Files to touch** with `path: L–L`
  - **Risks/Checks** (3 bullets)
- **Three joking beats** (short, gentle—no snark at authors)
- **Citations list** (all paths with ranges)

### B) Dialogue Script Prompt
**System role:** *Turn this outline into a 500–800 word conversation between Greptice (dry) and Forky (excited). Keep it punchy, helpful, and cite at least 3 times inline. Never invent paths.*

**Rules:**
- Start with a 1–2 line **cold open**.
- Use sparing stage tags: `[SFX: keyboard]`, `[MUSIC: sting]`.
- Include the **micro‑task plan** in dialogue (5 steps + commands).
- End with: **“To auto‑open that PR, use the button or type ‘create PR’.”**

### C) PR CTA (for transcript footer)
> Episode task: **{Goal}**. We can open a PR with the 5‑step change and verification steps. **$9 flat** (≤5 files / ≤300 LOC). Refund if maintainer closes as “not useful” within 7 days.

---

## Architecture (MVP)
- **Frontend:** Next.js (one page). Mic optional for v1 (text input is fine).
- **Backend:** Node/Express or FastAPI.
  - `/init_repo` → Greptile calls + Outline Builder
  - `/script` → Dialogue Scriptwriter
  - `/tts` → Two‑voice render + stitch
  - `/episode` → returns MP3 + transcript
- **Greptile tools:**
  - `search_code(query) -> [{path, start, end, snippet}]`
  - `read_file_range(path, start, end) -> text`
  - `list_repo_structure() -> summary`
- **Storage:** S3/Blob for cached outlines/audio; Redis for rate limiting.

---

## Monetization (optional in v1)
- **Free:** Generate & play/download episodes.
- **Paid action:** **Create PR** from the episode’s micro‑task ($9 flat).

**GitHub App scopes (later):** Metadata (read), Contents (r/w), Pull requests (r/w), Checks (read).

---

## Guardrails
- **Read‑only** until payment; no repo writes at episode time.
- **Citations required:** block output if <3 citations or any path not verified by Greptile.
- **Change caps for PRs:** max files/LOC; path allowlist; run `lint` & tests.
- **Tone safety:** avoid personal jokes; keep humor about code patterns only.

---

## 60–90 Minute Build Checklist
1. **Greptile hookup:** get structure + 3–5 cited snippets.
2. **Outline prompt:** fill template with real paths/line ranges.
3. **Script prompt:** generate 500–800 word dialogue.
4. **TTS:** pick 2 voices; render and stitch; add intro/outro sting.
5. **Next.js page:** URL input → Generate → show audio + transcript.
6. **Validation:** block if citations are missing/invalid.
7. **(Optional)** Stripe button for “Create PR.”

---

## Demo Script (2 minutes)
1. Paste repo URL → click **Generate Episode**.
2. Show spinner text: “Greptice is reading…”.
3. Play the episode for 20 seconds—Greptice cites `src/server.ts: L42–L77` and Forky reacts.
4. Scroll transcript to the **micro‑task** steps + commands.
5. Point at the **Create PR ($9)** button (stub or live).

---

## Stretch Goals
- **Issue matcher:** match skills/time to an open “good first issue.”
- **Maintainer mode:** record a custom intro per repo.
- **Localization:** additional languages.
- **Live “walk‑along”:** ask “what next?” while coding; it advances the 5‑step plan.

---

## Name & Tagline Ideas
- **Greptalk: Repo Radio** — “Your codebase, on the air.”
- **Greptalk Podcast Mode** — “From source to sound bite.”

---

## Notes
- Keep this MVP playful, precise, and **grounded by citations**. No citations → no episode.
