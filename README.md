# Greptalk: Repo Radio

**"Talk to a repo as a podcast"** - Turn any GitHub repository into a funny, cited 3-5 minute code podcast.

---

## Overview

Greptalk uses Greptile AI to analyze codebases and generates entertaining two-voice podcast episodes that:
- Explain what the repo does with real file citations
- Spotlight interesting patterns and hotspots
- Pitch a micro-task contribution (30-90 minutes)
- Ground everything in actual code (≥3 file/line citations)

**Characters**: Greptice (dry concierge) & Forky (curious junior)

---

## Quick Start

### Prerequisites

1. **Greptile API Key**: Get from [app.greptile.com](https://app.greptile.com)
2. **GitHub Token**: Personal access token with `repo` scope
3. **OpenAI or Anthropic API Key**: For script generation
4. **ElevenLabs or PlayHT API Key**: For text-to-speech

### Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Add your API keys
GREPTILE_API_KEY=your_greptile_key
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_key  # OR ANTHROPIC_API_KEY
ELEVENLABS_API_KEY=your_elevenlabs_key  # OR PLAYHT_API_KEY
```

### Test Greptile API (Before Building)

**IMPORTANT**: Run this first to understand citation format

```bash
# Install Node.js dependencies (just for testing)
npm install node-fetch

# Set environment variables
export GREPTILE_API_KEY="your-key"
export GITHUB_TOKEN="your-token"

# Run test
node test-greptile.js
```

This script will:
- Index a small test repo (`octocat/Hello-World`)
- Query it with natural language
- Show you **exactly** what citation format Greptile returns
- Determine if you need the GitHub API fallback (see PLAN.md 0.2.1)

### Install & Run (After Testing)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

---

## Project Structure

```
greptalk-radio/
├── PLAN.md                    # Phase-based development plan
├── Greptalk_Repo_Radio_MVP.md # Original MVP spec
├── test-greptile.js           # API test script (run this first!)
├── .env.example               # Environment template
├── src/
│   ├── app/                   # Next.js App Router
│   ├── lib/
│   │   ├── greptile.ts        # Greptile API client
│   │   ├── github.ts          # GitHub API (for citation fallback)
│   │   ├── llm.ts             # OpenAI/Claude integration
│   │   └── tts.ts             # Text-to-speech (ElevenLabs/PlayHT)
│   └── prompts/
│       ├── outline.ts         # Outline Builder prompt
│       └── script.ts          # Scriptwriter prompt
└── public/
    └── audio/                 # Generated episode MP3s
```

---

## Development Plan

See **[PLAN.md](./PLAN.md)** for the full phase-based development plan.

### Hackathon MVP (Phase 0)
1. Foundation Setup
2. **Greptile Integration** (test first with `test-greptile.js`)
3. Episode Generation Pipeline
4. Text-to-Speech
5. Output & Playback
6. Demo Readiness
7. Error Handling

**Critical Path**: Greptile → Outline → Script → TTS → Audio

---

## Greptile API Quick Reference

**Base URL**: `https://api.greptile.com/v2/`

### Index a Repo
```bash
curl -X POST https://api.greptile.com/v2/repositories \
  -H "Authorization: Bearer $GREPTILE_API_KEY" \
  -H "X-Github-Token: $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remote": "github",
    "repository": "owner/repo",
    "branch": "main"
  }'
```

### Check Status
```bash
curl https://api.greptile.com/v2/repositories/github:main:owner/repo \
  -H "Authorization: Bearer $GREPTILE_API_KEY" \
  -H "X-Github-Token: $GITHUB_TOKEN"
```

### Query Repo
```bash
curl -X POST https://api.greptile.com/v2/query \
  -H "Authorization: Bearer $GREPTILE_API_KEY" \
  -H "X-Github-Token: $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"content": "What does this repo do?", "role": "user"}],
    "repositories": [{
      "remote": "github",
      "repository": "owner/repo",
      "branch": "main"
    }],
    "genius": false
  }'
```

See **[PLAN.md - Greptile API Reference](./PLAN.md#greptile-api-reference)** for full details.

---

## Key Design Decisions

### Citation Format (CRITICAL)
- **Unknown until tested**: Greptile may or may not return line numbers
- **Test first** with `test-greptile.js` before building
- **Fallback strategy**: If no line numbers, use GitHub API to find them (see PLAN.md 0.2.1)

### Episode Structure
1. Cold open (10s joke)
2. What is this? (40-60s)
3. Guided tour (60-90s, ≥2 citations)
4. Pattern spotlight (40-60s, ≥1 citation)
5. Micro-task pitch (45-75s, 5 steps)
6. Outro + CTA (10-20s)

**Total**: 3-5 minutes, 500-800 words

### Output Contract
Every episode **must** include:
- ≥3 valid file/line citations
- 1 micro-task plan (5 steps + commands)
- 1 pattern example (copyable snippet)
- Risk/check list (2-3 bullets)
- Timebox label (<30m, 30-90m, >2h)

**Fail if missing** - no exceptions.

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (60s timeout)
- **AI**: Greptile (codebase analysis), OpenAI/Claude (scripts), ElevenLabs (TTS)
- **Deployment**: Vercel
- **Storage**: Base64 embedding (no external storage needed for MVP)

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - GREPTILE_API_KEY
# - GITHUB_TOKEN
# - OPENAI_API_KEY (or ANTHROPIC_API_KEY)
# - ELEVENLABS_API_KEY (optional, for audio)
```

**Production URL**: Will be provided after deployment

---

## Demo Script (2 Min)

**Test Repo Suggestions**:
- Small: `https://github.com/octocat/Hello-World`
- Medium: `https://github.com/vercel/next.js`

**Demo Flow**:
1. **Intro (20s)**: "Greptalk turns any GitHub repo into a podcast with citations. Watch."
2. **Paste URL (10s)**: Paste `octocat/Hello-World` → Check "Generate audio" → Click "Generate"
3. **Show Progress (10s)**: Wait for "Greptice is reading the repo..."
4. **Review Data (20s)**: Scroll through Citations, Hotspots, Patterns sections
5. **Play Audio (30s)**: Click play on audio player, listen to Greptice & Forky dialogue
6. **Show Script (20s)**: Scroll to podcast script with speaker labels
7. **Micro-Task (20s)**: Show 5-step contributor task
8. **CTA (10s)**: "Create PR" button (coming in Phase 2)
9. **Wrap (10s)**: "All grounded in real code citations. Questions?"

**Key Points to Highlight**:
- ✅ Real citations with line numbers (e.g., `README:L1-L5`)
- ✅ Two-voice podcast (Greptice: analytical, Forky: enthusiastic)
- ✅ MP3 download available
- ✅ All generated in ~30-60 seconds

---

## Known Risks & Mitigations

### Hackathon Risks
1. **Greptile indexing time** (2-5 min for large repos)
   - Test with small repos first, show progress bar
2. **Citation format unknown**
   - Test with `test-greptile.js`, build GitHub fallback
3. **Rate limits** (undocumented)
   - Cache everything, exponential backoff
4. **LLM hallucination**
   - Strict validation, fail fast
5. **Time crunch**
   - Prioritize working demo over polish

See **[PLAN.md - Risk Mitigation](./PLAN.md#risk-mitigation)** for full list.

---

## Contributing

This is a hackathon project. For post-hackathon contributions, see PLAN.md Phase 1+.

### First Steps
1. Run `test-greptile.js` to understand citation format
2. Read PLAN.md Phase 0
3. Pick a task from Phase 0.1-0.7
4. Build incrementally, validate early

---

## License

MIT (TBD)

---

## Links

- [Greptile Docs](https://docs.greptile.com)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [PlayHT API](https://docs.play.ht)
- [Original MVP Spec](./Greptalk_Repo_Radio_MVP.md)

---

**Built with ❤️  for hackathon demo magic**
