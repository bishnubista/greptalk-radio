# Greptalk: Repo Radio - Development Plan

**One-liner**: "Talk to a repo as a podcast" - Generate funny, cited 3-5 minute code podcasts from any GitHub URL.

---

## Branch Naming Convention

Each phase uses feature branches with the pattern: **`feat/phase-N-<feature-name>`**

Examples:
- `feat/phase-0-foundation`
- `feat/phase-0-greptile-integration`
- `feat/phase-1-performance`
- `feat/phase-2-pr-creation`

All phase branches merge to `main` via Pull Request.

---

## Phase 0: Hackathon MVP (Demo-First Build)
**Goal**: Ship a working demo that generates one complete episode with real citations and audio
**Timeline**: Hackathon duration (24-48 hours)

**Success Criteria**:
- Generate episode for 5/5 test repos (varied sizes)
- ≥3 valid citations in every episode
- Audio plays with distinct voices
- <3 min generation time
- Zero hallucinated file paths

---

### 0.1 Foundation Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up environment variables (`.env.local` template)
- [ ] Create single-page UI: URL input + Generate button
- [ ] Add loading spinner with progress text
- [ ] Basic error boundary and user-facing error messages

---

### 0.2 Greptile Integration (Core)

**Critical Finding** (from test-greptile.js): Greptile does **NOT** return line numbers - GitHub API fallback required (see 0.2.1)

- [ ] Set up Greptile API client with auth (`Authorization: Bearer {API_KEY}` + `X-Github-Token`)
- [ ] **Index Repository** (`POST /repositories`):
  - Submit repo for indexing: `{remote: "github", repository: "owner/repo", branch: "main"}`
  - Poll status: `GET /repositories/github:main:owner/repo`
  - Wait for `status: "completed"` before querying
  - Handle indexing failures (repo too large, not found, private)
- [ ] **Query Repository** (`POST /query`) for episode data:
  - Query 1: "What is this repo's purpose and tech stack? List the main files."
  - Query 2: "What are the entrypoints (main/index/server bootstrap files)? Give file paths."
  - Query 3: "Find 3 central files by import usage or architectural importance. Explain why each matters."
  - Query 4: "Show error handling, logging, or testing patterns. Give code examples with file paths."
  - Query 5: "Suggest a 30-90 minute micro-task for a first-time contributor with 5 concrete steps."
  - Use `genius: true` for complex queries (slower but smarter)
  - Use `sessionId` for follow-up questions in same context
- [ ] **Extract Citations** from Greptile responses:
  - Parse file paths, function/class names from responses
  - Test: check if responses include line numbers (e.g., `:L42-L77`)
  - If no line numbers: use GitHub API fallback (see 0.2.1)
- [ ] **Validate Citations**:
  - Verify every file path exists via GitHub API
  - Confirm functions/classes mentioned are in those files
  - Fail episode generation if <3 valid citations found
- [ ] Cache Greptile responses (in-memory for hackathon, Redis later)
- [ ] Error handling: repo not found, private repo, indexing timeout, query failures

#### 0.2.1 Citation Fallback Strategy

**Required**: Greptile doesn't return line numbers (confirmed via testing)

- [ ] Use GitHub API to fetch file contents: `GET /repos/{owner}/{repo}/contents/{path}`
- [ ] Search file for mentioned function/class/pattern
- [ ] Extract line numbers using regex or AST parsing (simple)
- [ ] Format as `path:Lstart-Lend` for transcript
- [ ] Fallback: if can't find line numbers, use `path` only + warning in transcript

---

### 0.3 Episode Generation Pipeline

- [ ] **Outline Builder** (LLM Prompt 1):
  - System prompt: Greptice role, factual outline, cite files/lines
  - Required sections: Purpose, Stack, Hotspots, Pattern, Micro-Task, Jokes
  - Output validation: check ≥3 citations, all paths verified
  - Fail fast if citations missing or invalid
- [ ] **Scriptwriter** (LLM Prompt 2):
  - System prompt: convert outline → 500-800 word dialogue
  - Two characters: Greptice (dry) & Forky (excited)
  - Include cold open, micro-task steps, outro CTA
  - Preserve all citations from outline
- [ ] Test with 3 diverse repos (small/medium, different languages)

---

### 0.4 Text-to-Speech (TTS)

- [ ] Select TTS provider (ElevenLabs or PlayHT for multi-speaker)
- [ ] Configure 2 voices: Greptice (deadpan male) & Forky (peppy female)
- [ ] Parse script into speaker segments
- [ ] Generate audio per segment with voice labels
- [ ] Stitch segments into single MP3 (with 0.3s pauses)
- [ ] Add 2-3 second intro/outro sting (optional, can be silence)
- [ ] Basic audio normalization (target -16 LUFS or similar)

---

### 0.5 Output & Playback

- [ ] Display audio player (play/pause/download) on result page
- [ ] Render transcript markdown with inline citations
- [ ] Highlight citations with `code` style (e.g., `src/server.ts:L42-L77`)
- [ ] Add copyable code snippets from pattern examples
- [ ] Show micro-task plan with 5 steps + commands in collapsible section
- [ ] Stub "Create PR ($9)" button with "Coming Soon" tooltip

---

### 0.6 Demo Readiness

- [ ] Test end-to-end with 5 different repos:
  - Small (< 50 files): personal project
  - Medium (50-500 files): popular library
  - Large (> 500 files): framework repo
  - TypeScript project
  - Python project
- [ ] Verify all episodes have ≥3 citations
- [ ] Verify audio quality is clear and voices are distinct
- [ ] Create demo script (2 min presentation flow)
- [ ] Record demo video (optional but recommended)
- [ ] Deploy to Vercel/Netlify with public URL

---

### 0.7 Error Handling & Edge Cases

- [ ] "Repo not found" message with example URL
- [ ] "Private repo not supported (yet)" message
- [ ] "Repo too large" message (>50K files) with suggestion
- [ ] "Unable to generate task" fallback (suggest different repo)
- [ ] LLM timeout handling (>60s) with retry logic
- [ ] TTS failure fallback (show transcript only)

---

## Phase 1: Post-Hackathon Stabilization
**Goal**: Production-ready reliability and performance
**Timeline**: 1-2 weeks

**Success Criteria**:
- 95% success rate on 50 random public repos
- <2 min P95 generation time
- Zero runtime errors in 100 episodes

### 1.1 Performance Optimization
- [ ] Implement proper caching (Redis or Upstash)
- [ ] Cache Greptile responses by repo URL + commit SHA
- [ ] Cache generated outlines for 7 days
- [ ] Parallel API calls: Greptile + LLM outline generation
- [ ] Optimize TTS: batch segments by speaker
- [ ] Add CDN for audio files (S3 + CloudFront)
- [ ] Instrument with timing logs (Greptile, LLM, TTS)

### 1.2 Quality Improvements
- [ ] Prompt engineering iteration:
  - A/B test 3 outline prompt variants
  - Improve joke quality (less cringe, more clever)
  - Better micro-task sizing (calibrate to actual 30-90 min)
- [ ] Citation quality:
  - Verify line ranges are meaningful (not just random)
  - Ensure snippets match cited ranges
  - Add context (± 5 lines) for better understanding
- [ ] Audio quality:
  - Fine-tune voice parameters (speed, pitch, emphasis)
  - Add subtle background music (optional)
  - Better speaker transitions (cross-fade?)

### 1.3 User Experience Polish
- [ ] Add "Recent Episodes" gallery (5 examples)
- [ ] Share episode via URL (store in DB)
- [ ] Permalink per episode with metadata (repo, timestamp)
- [ ] Social share cards (og:image with repo name + "Repo Radio")
- [ ] Download transcript as markdown file
- [ ] Copy-to-clipboard for code snippets
- [ ] Dark mode support

### 1.4 Monitoring & Analytics
- [ ] Error tracking (Sentry or similar)
- [ ] Usage analytics (PostHog or Plausible)
- [ ] Track: repos attempted, success rate, avg generation time
- [ ] Alert on: high error rate, slow responses, API quota limits
- [ ] User feedback form ("Was this episode helpful?")

---

## Phase 2: Monetization & Advanced Features
**Goal**: Launch paid PR creation and expand capabilities
**Timeline**: 2-3 weeks

**Success Criteria**:
- 10 paid PR creations
- 80% PR acceptance rate
- 5-star average review

### 2.1 PR Creation (Paid Feature)
- [ ] GitHub App setup:
  - Scopes: metadata (read), contents (r/w), pull_requests (r/w)
  - OAuth flow for user authorization
  - Webhook for PR status tracking
- [ ] PR Builder:
  - Parse micro-task steps into file changes
  - Use Greptile to read existing code
  - LLM to generate code changes (5-step plan → diffs)
  - Validate: max 5 files, max 300 LOC, no secrets
  - Run `lint` and tests in fork (GitHub Actions)
  - Create PR with detailed description
- [ ] Payment flow:
  - Stripe integration ($9 flat)
  - Payment required before PR creation
  - Refund policy: 7 days if closed as "not useful"
  - Track: PR merged, PR closed, refund issued
- [ ] Safety:
  - Path allowlist (no `.env`, no lock files)
  - Dry-run mode (show diff before payment)
  - Manual review queue (first 20 PRs)

### 2.2 Advanced Episode Features
- [ ] Issue matcher:
  - Fetch open "good first issue" labels
  - Match episode micro-task to existing issue
  - Suggest: "This task matches issue #42!"
- [ ] Maintainer mode:
  - Allow repo owners to record custom intro (30s)
  - Override default personality (formal vs casual)
  - Pin preferred micro-tasks
- [ ] Multi-language support:
  - Spanish, French, German scripts
  - Keep English citations
  - TTS in target language

### 2.3 Scale & Reliability
- [ ] Rate limiting (per user, per IP)
- [ ] Queue system for generation (BullMQ or similar)
- [ ] Background processing (workers for long-running tasks)
- [ ] Database migrations (Prisma + PostgreSQL)
- [ ] Backup strategy for audio/transcripts
- [ ] Load testing (1000 episodes / hour)

---

## Phase 3: Community & Growth (Stretch)
**Goal**: Build community around code learning via audio
**Timeline**: Ongoing

### 3.1 Community Features
- [ ] User accounts (save favorite episodes)
- [ ] Playlist builder ("Learn React Ecosystem")
- [ ] Comments on episodes
- [ ] Upvote/downvote episodes
- [ ] Request episode for specific repo

### 3.2 Content Expansion
- [ ] Weekly "Repo of the Week" series
- [ ] Interview mode: Q&A with maintainers
- [ ] Deep-dive episodes (15-20 min for complex repos)
- [ ] Series: "Architecture Patterns in Popular Repos"

### 3.3 Platform Integrations
- [ ] Podcast RSS feed (distribute to Apple Podcasts, Spotify)
- [ ] Discord bot ("!greptalk [repo-url]")
- [ ] VS Code extension (right-click repo → Generate Episode)
- [ ] CLI tool (`greptalk generate [url]`)

---

## Technical Stack (Hackathon MVP)

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components (audio player, buttons)

### Backend
- Next.js API routes
- **Greptile API** (v2) - Natural language codebase queries with AI
- **OpenAI GPT-4** or **Anthropic Claude** for outline + script generation
- **ElevenLabs** or **PlayHT** (TTS with multi-speaker)
- **GitHub REST API** (for citation validation and file fetching)

### Storage & Caching
- Vercel KV (Redis) for caching (post-hackathon)
- S3 for audio files (post-hackathon)
- In-memory cache for hackathon MVP

### Deployment
- Vercel (frontend + API routes)
- Environment variables:
  - `GREPTILE_API_KEY` (from app.greptile.com)
  - `GITHUB_TOKEN` (personal access token with `repo` scope)
  - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY` or `PLAYHT_API_KEY`

---

## Greptile API Reference

**Base URL**: `https://api.greptile.com/v2/`

### Authentication
```bash
Authorization: Bearer {GREPTILE_API_KEY}
X-Github-Token: {GITHUB_TOKEN}  # Required for private repos, recommended for all
Content-Type: application/json
```

### Endpoints

#### 1. Index Repository
```bash
POST /repositories
Body: {
  "remote": "github",
  "repository": "owner/repo",
  "branch": "main"
}
Response: { "status": "processing", "sha": "abc123..." }
```

#### 2. Check Indexing Status
```bash
GET /repositories/github:main:owner/repo
Response: {
  "status": "completed" | "processing" | "failed",
  "filesProcessed": 1234,
  "sha": "abc123..."
}
```

#### 3. Query Repository
```bash
POST /query
Body: {
  "messages": [{ "content": "Your question here", "role": "user" }],
  "repositories": [{
    "remote": "github",
    "repository": "owner/repo",
    "branch": "main"
  }],
  "sessionId": "optional-session-id",  # For conversation continuity
  "stream": false,                      # True for streaming responses
  "genius": false                       # True for smarter/slower (8-10s)
}
Response: {
  "message": "Answer with code references...",
  "sources": [{ "filepath": "...", "linestart": ..., "lineend": ... }]  # Format TBD
}
```

#### 4. Search Repository (returns refs only, no answer)
```bash
POST /search
Body: { same as /query }
Response: { "sources": [...] }  # No message field
```

### Key Constraints
- **Indexing time**: Unknown (could be 30s - 5min for large repos)
- **Rate limits**: Not documented (assume conservative: 10 req/min)
- **Supported languages**: C, C++, C#, Elixir, Go, Java, JS, Kotlin, OCaml, PHP, Python, Ruby, Rust, Scala, TypeScript
- **Max repo size**: Not specified (test with <10K files for safety)
- **Citation format**: **UNKNOWN** - may or may not include line numbers
  - **Critical**: Test this first to determine fallback strategy

### Usage Pattern for Greptalk
```
1. Index repo (POST /repositories)
2. Poll until status = "completed" (retry every 3s, max 2 min)
3. Query 5 times for episode data (purpose, entrypoints, hotspots, patterns, micro-task)
4. Extract citations from responses
5. Validate citations via GitHub API
6. Pass to LLM for outline generation
```

---

## Risk Mitigation

### Hackathon Risks
1. **Greptile indexing time**: Large repos may take 2-5 min to index
   - **Mitigation**: Show progress bar, test with small repos first, set 3 min timeout
2. **Citation format unknown**: Greptile may not return line numbers
   - **Mitigation**: Build GitHub API fallback (see 0.2.1), test with 3 repos before building
3. **Greptile rate limits**: Undocumented, could hit limits during testing
   - **Mitigation**: Add exponential backoff, cache all responses, use sessionId for follow-ups
4. **LLM hallucination**: May invent citations even with grounding
   - **Mitigation**: Strict validation, fail fast if citations don't verify
5. **TTS quality variance**: Some repos will produce awkward dialogue
   - **Mitigation**: Test with 10+ repos, pick best voice combo, iterate prompt
6. **Time crunch**: Too many features, not enough time
   - **Mitigation**: Prioritize working audio over perfect transcript, stub PR feature

### Post-Hackathon Risks
1. **API costs**: Greptile + OpenAI + TTS = $$$
   - **Mitigation**: Monitor spend, set hard limits, cache aggressively (7 days)
2. **PR quality**: Generated tasks may be wrong or break repos
   - **Mitigation**: Manual review first 20, dry-run mode, run tests in fork
3. **Repo diversity**: Config-only, data-heavy, or non-code repos won't work
   - **Mitigation**: Detect early (check file extensions), suggest alternatives, document limits
4. **Greptile indexing failures**: Some repos may fail to index
   - **Mitigation**: Retry with smaller branch, fallback to GitHub API search, clear error messages

---

## Demo Script (2 Minutes)

### Setup
- Open browser to deployed app
- Have 2-3 test repos ready (e.g., `vercel/next.js`, `facebook/react`, personal project)

### Flow
1. **Intro (20s)**: "Greptalk turns any GitHub repo into a podcast. Let me show you."
2. **Paste URL (10s)**: Paste `https://github.com/vercel/next.js` → Click "Generate Episode"
3. **Show Progress (10s)**: "Greptice is reading the repo..." (spinner with updates)
4. **Play Audio (30s)**: Play first 30 seconds - highlight when Greptice cites `packages/next/src/server/next.ts:L42-L77`
5. **Show Transcript (30s)**: Scroll to micro-task section, show 5 steps + commands
6. **Show Citation (20s)**: Click citation link, show how it grounds the episode
7. **CTA (10s)**: Point at "Create PR" button, explain "$9 to auto-generate this task"
8. **Wrap (10s)**: "Free to generate, pay only to create PRs. Questions?"

---

## Success Metrics (Hackathon)
- ✅ Complete end-to-end episode generation
- ✅ 5/5 test repos generate valid episodes
- ✅ Audio plays with 2 distinct voices
- ✅ All episodes have ≥3 verified citations
- ✅ Demo runs smoothly in front of judges
- ✅ Deployed with public URL

## Success Metrics (Post-Hackathon)
- 100 episodes generated (organic usage)
- 4+ star average rating
- <5% error rate
- Featured on HackerNews / ProductHunt

---

## Notes
- Keep hackathon scope tight: working > perfect
- Citations are the killer feature - never compromise
- Audio quality matters more than transcript polish
- Stub paid features, focus on free experience first
- Document all API keys and setup in README
