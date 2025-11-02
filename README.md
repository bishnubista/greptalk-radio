# Greptalk: Repo Radio

**"Talk to a repo as a podcast"** - Turn any GitHub repository into a funny, cited 3-5 minute code podcast.

---

## Demo

📦 **[Download Demo Files](https://github.com/bishnubista/greptalk-radio/releases/tag/hackathon-demo)**

🎥 **[Watch Demo Video](https://github.com/bishnubista/greptalk-radio/releases/download/hackathon-demo/greptalk-screenrecord.mov)** (33 MB)

🎧 **[Listen to Sample Episode](https://github.com/bishnubista/greptalk-radio/releases/download/hackathon-demo/greptalk-SAFE-MCP-safe-mcp-episode.mp3)** - SAFE-MCP repository (3.7 MB)

---

## What It Does

Greptalk uses Greptile AI to analyze any GitHub repository and generates an entertaining two-voice podcast episode featuring:

- **Real code citations** - Every claim backed by actual file/line references
- **Two personalities** - Greptice (analytical concierge) & Forky (curious junior dev)
- **Contributor micro-task** - A 30-90 minute task to help newcomers get started
- **Pattern spotlight** - Interesting code patterns worth learning

**Output**: 3-5 minute MP3 podcast episode, downloadable and shareable.

---

## Quick Start

### Prerequisites

API keys required:
- **Greptile** - Get from [app.greptile.com](https://app.greptile.com)
- **GitHub Token** - Personal access token with `repo` scope
- **OpenAI or Anthropic** - For script generation
- **ElevenLabs** (optional) - For text-to-speech audio

### Setup

```bash
# Clone and install
git clone https://github.com/bishnubista/greptalk-radio.git
cd greptalk-radio
npm install

# Configure environment
cp .env.example .env.local
# Add your API keys to .env.local

# Run development server
npm run dev
# Open http://localhost:3000
```

### Usage

1. Paste any GitHub repo URL (e.g., `https://github.com/octocat/Hello-World`)
2. Click "Generate Episode"
3. Wait ~30-60 seconds for indexing and generation
4. Listen to your podcast or download the MP3

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI Services**:
  - Greptile (codebase analysis)
  - OpenAI/Claude (script generation)
  - ElevenLabs (text-to-speech)
- **Deployment**: Vercel

---

## Links

- [Development Plan](./PLAN.md) - Phase-based roadmap
- [Greptile Docs](https://docs.greptile.com) - API documentation
- [Original MVP Spec](./Greptalk_Repo_Radio_MVP.md) - Design document

---

**Built for hackathon demo magic**
