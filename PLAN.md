# Greptalk: Repo Radio - Development Plan

**One-liner**: "Talk to a repo as a podcast" - Generate funny, cited 3-5 minute code podcasts from any GitHub URL.

---

## Phase 0: Hackathon MVP ✅ COMPLETE

**Goal**: Ship a working demo that generates one complete episode with real citations and audio
**Timeline**: Hackathon duration (24-48 hours)

**Success Criteria**: ✅ ALL MET
- ✅ Generate episode for 5/5 test repos (varied sizes)
- ✅ ≥3 valid citations in every episode
- ✅ Audio plays with distinct voices
- ✅ <3 min generation time
- ✅ Zero hallucinated file paths

---

### 0.1 Foundation Setup ✅
- ✅ Initialize Next.js project with TypeScript
- ✅ Set up environment variables (`.env.local` template)
- ✅ Create single-page UI: URL input + Generate button
- ✅ Add loading spinner with progress text
- ✅ Basic error boundary and user-facing error messages

### 0.2 Greptile Integration ✅
- ✅ Set up Greptile API client with auth
- ✅ Index Repository with status polling
- ✅ Query Repository for episode data (5 queries: purpose, entrypoints, hotspots, patterns, micro-task)
- ✅ Extract Citations from Greptile responses
- ✅ Validate Citations via GitHub API
- ✅ Cache Greptile responses
- ✅ Error handling: repo not found, private repo, indexing timeout

#### 0.2.1 Citation Fallback Strategy ✅
- ✅ Use GitHub API to fetch file contents
- ✅ Search file for mentioned function/class/pattern
- ✅ Extract line numbers using regex
- ✅ Format as `path:Lstart-Lend` for transcript

### 0.3 Episode Generation Pipeline ✅
- ✅ Outline Builder (LLM Prompt 1) with citation validation
- ✅ Scriptwriter (LLM Prompt 2) with two-character dialogue
- ✅ Tested with diverse repos (small/medium, different languages)

### 0.4 Text-to-Speech (TTS) ✅
- ✅ ElevenLabs integration
- ✅ Configure 2 voices: Greptice (analytical) & Forky (enthusiastic)
- ✅ Parse script into speaker segments
- ✅ Generate audio per segment with voice labels
- ✅ Stitch segments into single MP3

### 0.5 Output & Playback ✅
- ✅ Display audio player (play/pause/download)
- ✅ Render transcript markdown with inline citations
- ✅ Highlight citations with code style
- ✅ Show micro-task plan with 5 steps + commands
- ✅ Copyable code snippets from pattern examples

### 0.6 Demo Readiness ✅
- ✅ Test end-to-end with 5 different repos
- ✅ Verify all episodes have ≥3 citations
- ✅ Verify audio quality is clear and voices are distinct
- ✅ Record demo video
- ✅ Deploy to Vercel with public URL
- ✅ Create demo materials (video + sample audio)

### 0.7 Error Handling & Edge Cases ✅
- ✅ "Repo not found" message
- ✅ "Private repo not supported" message
- ✅ "Repo too large" handling with dynamic timeout
- ✅ LLM timeout handling with retry logic
- ✅ TTS failure fallback
- ✅ Robust dialogue parsing for TTS

---

## Technical Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

### Backend & AI
- Next.js API routes
- **Greptile API** (v2) - Codebase analysis
- **Anthropic Claude** - Outline + script generation
- **ElevenLabs** - Multi-voice TTS
- **GitHub REST API** - Citation validation

### Deployment
- Vercel (frontend + API routes)
- Environment variables:
  - `GREPTILE_API_KEY`
  - `GITHUB_TOKEN`
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`

---

## Greptile API Reference

**Base URL**: `https://api.greptile.com/v2/`

### Authentication
```bash
Authorization: Bearer {GREPTILE_API_KEY}
X-Github-Token: {GITHUB_TOKEN}
Content-Type: application/json
```

### Key Endpoints

**Index Repository**
```bash
POST /repositories
Body: {
  "remote": "github",
  "repository": "owner/repo",
  "branch": "main"
}
```

**Check Status**
```bash
GET /repositories/github:main:owner/repo
Response: { "status": "completed" | "processing" | "failed" }
```

**Query Repository**
```bash
POST /query
Body: {
  "messages": [{ "content": "Your question", "role": "user" }],
  "repositories": [{
    "remote": "github",
    "repository": "owner/repo",
    "branch": "main"
  }],
  "genius": false  # true for smarter/slower queries
}
```

### Key Constraints
- **Indexing time**: 30s - 5min for large repos
- **Rate limits**: ~10 req/min (undocumented)
- **Citation format**: Does NOT include line numbers - GitHub API fallback required

---

## Demo Checklist

✅ **Pre-Demo**
- ✅ Test with 3-5 sample repos
- ✅ Verify all API keys are working
- ✅ Check deployed app is live
- ✅ Record demo video
- ✅ Create sample audio file

✅ **Demo Materials**
- ✅ Demo video uploaded to GitHub release
- ✅ Sample audio episode uploaded to GitHub release
- ✅ README streamlined for hackathon judges
- ✅ Public deployment URL available

---

## Success Metrics ✅

✅ **Hackathon Goals - ALL ACHIEVED**
- ✅ Complete end-to-end episode generation
- ✅ 5/5 test repos generate valid episodes
- ✅ Audio plays with 2 distinct voices
- ✅ All episodes have ≥3 verified citations
- ✅ Demo video and sample audio ready
- ✅ Deployed with public URL

---

**Built for hackathon demo magic**
