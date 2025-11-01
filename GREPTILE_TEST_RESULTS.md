# Greptile API Test Results

**Test Date**: 2025-11-01
**Test Script**: `test-greptile.js`
**Test Repo**: `octocat/Hello-World`

---

## Summary

✅ **Greptile API works as expected**
❌ **No line numbers in citation format** - GitHub API fallback required

---

## Key Findings

### 1. Citation Format

Greptile returns citations in the `sources` array with the following structure:

```json
{
  "repository": "octocat/hello-world",
  "remote": "github",
  "remoteUrl": "",
  "branch": "master",
  "filepath": "README",
  "distance": 0,
  "sha": "",
  "content": "File content accessed via tool",
  "summary": "File accessed via engine-mini"
}
```

**Fields Available:**
- ✅ `filepath` - File path relative to repo root
- ✅ `repository` - Owner/repo name
- ✅ `remote` - "github" or "gitlab"
- ✅ `branch` - Branch name
- ✅ `summary` - Brief description
- ❌ **NO `linestart`** - Not provided
- ❌ **NO `lineend`** - Not provided

### 2. Indexing Behavior

- Repo was already indexed: `"message": "Repository is up to date"`
- Status check returns: `"status": "COMPLETED"` (uppercase)
- Files processed: 2 (for tiny Hello-World repo)
- **Indexing is fast** for small repos (instant if already indexed)

### 3. Query Responses

- Natural language queries work well
- Responses include detailed explanations
- `genius: false` (fast mode) works fine for simple queries
- `genius: true` provides more detailed analysis
- Queries can reference file contents

---

## Critical Decision: GitHub API Fallback Required

Since Greptile does **NOT** provide line numbers (`linestart`/`lineend`), we must implement the fallback strategy from PLAN.md section 0.2.1:

### Fallback Strategy

1. **Extract filepath** from Greptile `sources` array
2. **Fetch file contents** via GitHub API:
   ```
   GET /repos/{owner}/{repo}/contents/{path}?ref={branch}
   ```
3. **Search for mentioned function/class/pattern** in file
4. **Calculate line numbers** using:
   - Regex search for function/class names
   - Simple string matching
   - Or return entire file reference if specific lines can't be determined
5. **Format as** `path:Lstart-Lend` for transcript

### Implementation Priority

This is a **Phase 0.2** critical task - must be completed before outline generation.

---

## Sample Responses

### Query 1: "What is this repo's purpose? List the main files with their paths."

**Response Summary:**
- Identified purpose: "Hello World" demo repo
- Listed files: `README`
- No line numbers provided

### Query 2: "What are the entrypoints or main files? Give exact file paths."

**Response Summary:**
- Correctly identified: `/README` as single entry point
- Good natural language explanation
- No line numbers provided

### Query 3 (Genius Mode): "Show me a code pattern or function with its file path and explain what it does."

**Response Summary:**
- More detailed explanation than non-genius mode
- Still no line numbers
- Provided file path: `/README`

---

## Recommendations

### For Greptalk Implementation

1. **Always use GitHub API** to enrich citations with line numbers
2. **Cache GitHub file fetches** to avoid rate limits
3. **Handle edge cases:**
   - Function/class not found → use full file reference
   - File too large (>1MB) → skip line number lookup
   - Binary files → exclude from citations
4. **Validate all file paths** exist before using in script

### Query Strategy

- Use **sessionId** to maintain conversation context
- Start with broad queries (purpose, structure)
- Follow up with specific queries (patterns, examples)
- Use **genius mode sparingly** (slower, costs more)
- Ask for "file paths" explicitly in prompts

---

## Next Steps

1. ✅ Test completed - findings documented
2. [ ] Implement GitHub API client (`src/lib/github.ts`)
3. [ ] Build citation enrichment logic
4. [ ] Test with larger repo (e.g., 100+ files)
5. [ ] Validate line number extraction accuracy

---

## Test Script Output

<details>
<summary>Full test output</summary>

```
🚀 Greptile API Test Starting...

📥 Indexing repository: octocat/Hello-World...
Index response: {
  "message": "Repository is up to date",
  "statusEndpoint": "https://api.greptile.com/v2/repositories/github%3Amaster%3Aoctocat%2Fhello-world"
}

✅ Indexing completed!

💬 Query 1: "What is this repo's purpose? List the main files with their paths."
Sources: 1 item (filepath: README)

💬 Query 2: "What are the entrypoints or main files? Give exact file paths."
Sources: 1 item (filepath: README)

💬 Query 3 (Genius): "Show me a code pattern or function with its file path and explain what it does."
Sources: 1 item (filepath: README)

✅ All tests completed!
```

</details>
