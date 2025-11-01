/**
 * Citation Pipeline
 *
 * Combines Greptile queries with GitHub API to create enriched citations
 * Ensures ≥3 valid citations as per PLAN.md requirements
 */

import {
  type GreptileRepository,
  type GreptileQueryResponse,
  extractFilePaths,
  queryForEpisodeData,
} from './greptile';
import {
  type Citation,
  enrichCitation,
  validateFilePath,
  formatCitation,
  parseGitHubUrl,
} from './github';

export interface EpisodeData {
  purpose: string;
  entrypoints: string;
  hotspots: string;
  patterns: string;
  microTask: string;
  citations: Citation[];
  rawResponses: {
    purpose: GreptileQueryResponse;
    entrypoints: GreptileQueryResponse;
    hotspots: GreptileQueryResponse;
    patterns: GreptileQueryResponse;
    microTask: GreptileQueryResponse;
  };
}

/**
 * Extract potential function/class names from natural language text
 * Used to search for line numbers in GitHub files
 */
function extractSearchTerms(text: string): string[] {
  const terms: string[] = [];

  // Look for code-like patterns: camelCase, PascalCase, snake_case
  const codePatterns = [
    /\b([a-z][a-zA-Z0-9]*)\b/g, // camelCase
    /\b([A-Z][a-zA-Z0-9]*)\b/g, // PascalCase
    /\b([a-z_][a-z0-9_]*)\b/g, // snake_case
  ];

  codePatterns.forEach(pattern => {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1] && match[1].length > 3) {
        // Filter out common words
        terms.push(match[1]);
      }
    }
  });

  // Remove duplicates and limit
  return Array.from(new Set(terms)).slice(0, 10);
}

/**
 * Generate episode data from repository
 * Returns episode content + citations
 */
export async function generateEpisodeData(
  repoUrl: string,
  onProgress?: (step: number, message: string) => void
): Promise<EpisodeData> {
  // Parse GitHub URL
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub URL');
  }

  const { owner, repo, branch = 'main' } = parsed;

  // Create Greptile repository object
  const greptileRepo: GreptileRepository = {
    remote: 'github',
    repository: `${owner}/${repo}`,
    branch,
  };

  // Query Greptile for episode data
  if (onProgress) onProgress(0, 'Querying repository with Greptile AI...');

  const responses = await queryForEpisodeData(greptileRepo, onProgress);

  // Extract all file paths mentioned
  const allPaths = extractFilePaths([
    responses.purpose,
    responses.entrypoints,
    responses.hotspots,
    responses.patterns,
    responses.microTask,
  ]);

  if (onProgress) onProgress(6, `Found ${allPaths.length} file references, validating...`);

  // Validate file paths and enrich with line numbers
  const citations: Citation[] = [];

  for (const filepath of allPaths) {
    // Validate path exists
    const exists = await validateFilePath(owner, repo, filepath, branch);
    if (!exists) {
      console.warn(`Skipping invalid path: ${filepath}`);
      continue;
    }

    // Extract potential search terms from all responses
    const searchTerms = extractSearchTerms(
      responses.purpose.message +
        responses.entrypoints.message +
        responses.hotspots.message +
        responses.patterns.message
    );

    // Enrich with line numbers
    const citation = await enrichCitation(
      owner,
      repo,
      filepath,
      branch,
      searchTerms
    );

    citations.push(citation);

    // Limit to avoid rate limits (max 10 citations for MVP)
    if (citations.length >= 10) break;
  }

  // Ensure minimum 3 citations
  if (citations.length < 3) {
    throw new Error(
      `Insufficient citations: Found ${citations.length}, need at least 3. ` +
        `Try a different repository with more code files.`
    );
  }

  if (onProgress) {
    onProgress(7, `✓ ${citations.length} citations validated and enriched`);
  }

  return {
    purpose: responses.purpose.message,
    entrypoints: responses.entrypoints.message,
    hotspots: responses.hotspots.message,
    patterns: responses.patterns.message,
    microTask: responses.microTask.message,
    citations,
    rawResponses: responses,
  };
}

/**
 * Format citations for display in transcript
 */
export function formatCitationsForTranscript(citations: Citation[]): string {
  return citations
    .map((c, i) => `${i + 1}. ${formatCitation(c)}${c.functionName ? ` (${c.functionName})` : ''}`)
    .join('\n');
}

/**
 * Validate episode data meets requirements
 * From PLAN.md: ≥3 citations, micro-task with 5 steps
 */
export function validateEpisodeData(data: EpisodeData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check citation count
  if (data.citations.length < 3) {
    errors.push(`Only ${data.citations.length} citations (need ≥3)`);
  }

  // Check micro-task has steps (support multiple list formats)
  // Match: numbered (1.), bulleted (-, *, •), lettered (a), A.), or line breaks as fallback
  const stepPatterns = [
    /\d+\./g,           // 1. 2. 3.
    /^[-*•]\s/gm,       // - or * or • at start of line
    /[a-z]\)/gi,        // a) b) c) or A) B) C)
    /[A-Z]\./g,         // A. B. C.
  ];

  let stepCount = 0;
  for (const pattern of stepPatterns) {
    const matches = data.microTask.match(pattern);
    if (matches && matches.length > stepCount) {
      stepCount = matches.length;
    }
  }

  // Fallback: count newlines if no list markers found (at least 5 lines)
  if (stepCount === 0) {
    const lines = data.microTask.split('\n').filter(line => line.trim().length > 10);
    stepCount = lines.length;
  }

  if (stepCount < 5) {
    errors.push(`Micro-task has ${stepCount} steps (need 5)`);
  }

  // Check all required sections are present
  if (!data.purpose || data.purpose.length < 50) {
    errors.push('Purpose section too short or missing');
  }

  if (!data.patterns || data.patterns.length < 50) {
    errors.push('Patterns section too short or missing');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
