/**
 * Greptile API Client
 *
 * Provides methods to:
 * 1. Index a GitHub repository
 * 2. Check indexing status
 * 3. Query repository with natural language
 *
 * Critical: Greptile does NOT return line numbers (linestart/lineend)
 * See: GREPTILE_TEST_RESULTS.md
 */

const BASE_URL = 'https://api.greptile.com/v2';

export interface GreptileRepository {
  remote: 'github' | 'gitlab';
  repository: string; // Format: "owner/repo"
  branch: string;
}

export interface GreptileSource {
  repository: string;
  remote: string;
  branch: string;
  filepath: string;
  distance: number;
  summary?: string;
  content?: string;
}

export interface GreptileQueryResponse {
  message: string;
  sources: GreptileSource[];
}

export interface IndexStatusResponse {
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  filesProcessed?: number;
  sha?: string;
}

/**
 * Index a repository for searching
 */
export async function indexRepository(
  repo: GreptileRepository
): Promise<{ status: string; statusEndpoint: string }> {
  const response = await fetch(`${BASE_URL}/repositories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GREPTILE_API_KEY}`,
      'X-Github-Token': process.env.GITHUB_TOKEN || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(repo),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to index repository: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Check repository indexing status
 */
export async function checkIndexStatus(
  repo: GreptileRepository
): Promise<IndexStatusResponse> {
  const repoId = `${repo.remote}:${repo.branch}:${repo.repository}`;
  const encodedRepoId = encodeURIComponent(repoId);

  const response = await fetch(`${BASE_URL}/repositories/${encodedRepoId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.GREPTILE_API_KEY}`,
      'X-Github-Token': process.env.GITHUB_TOKEN || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to check status: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Wait for repository indexing to complete
 * Polls every 3 seconds with max timeout
 */
export async function waitForIndexing(
  repo: GreptileRepository,
  maxWaitTime = 180000, // 3 minutes
  onProgress?: (status: string, filesProcessed?: number) => void
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkIndexStatus(repo);
    const statusLower = status.status.toLowerCase();

    if (onProgress) {
      onProgress(status.status, status.filesProcessed);
    }

    if (statusLower === 'completed') {
      return;
    }

    if (statusLower === 'failed') {
      throw new Error('Repository indexing failed');
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('Repository indexing timeout (3 minutes)');
}

/**
 * Query repository with natural language
 */
export async function queryRepository(
  repo: GreptileRepository,
  question: string,
  options: {
    sessionId?: string;
    genius?: boolean;
  } = {}
): Promise<GreptileQueryResponse> {
  const response = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GREPTILE_API_KEY}`,
      'X-Github-Token': process.env.GITHUB_TOKEN || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          content: question,
          role: 'user',
        },
      ],
      repositories: [repo],
      sessionId: options.sessionId || `session-${Date.now()}`,
      stream: false,
      genius: options.genius || false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Query failed: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Query repository 5 times for episode data
 * Uses sessionId to maintain context across queries
 */
export async function queryForEpisodeData(
  repo: GreptileRepository,
  onProgress?: (step: number, message: string) => void
): Promise<{
  purpose: GreptileQueryResponse;
  entrypoints: GreptileQueryResponse;
  hotspots: GreptileQueryResponse;
  patterns: GreptileQueryResponse;
  microTask: GreptileQueryResponse;
}> {
  const sessionId = `episode-${Date.now()}`;

  if (onProgress) onProgress(1, 'Analyzing repository purpose and stack...');
  const purpose = await queryRepository(
    repo,
    "What is this repo's purpose and tech stack? List the main files with their paths.",
    { sessionId }
  );

  if (onProgress) onProgress(2, 'Finding entrypoints and main files...');
  const entrypoints = await queryRepository(
    repo,
    "What are the entrypoints (main/index/server bootstrap files)? Give exact file paths.",
    { sessionId }
  );

  if (onProgress) onProgress(3, 'Identifying central files and hotspots...');
  const hotspots = await queryRepository(
    repo,
    "Find 3 central files by import usage or architectural importance. Explain why each matters and give file paths.",
    { sessionId }
  );

  if (onProgress) onProgress(4, 'Analyzing code patterns...');
  const patterns = await queryRepository(
    repo,
    "Show error handling, logging, or testing patterns. Give code examples with exact file paths.",
    { sessionId, genius: true } // Use genius mode for patterns
  );

  if (onProgress) onProgress(5, 'Generating micro-task for contributors...');
  const microTask = await queryRepository(
    repo,
    "Suggest a 30-90 minute micro-task for a first-time contributor with 5 concrete steps. Include file paths for changes.",
    { sessionId, genius: true }
  );

  return {
    purpose,
    entrypoints,
    hotspots,
    patterns,
    microTask,
  };
}

/**
 * Extract all file paths from Greptile sources
 * Returns unique file paths mentioned in responses
 */
export function extractFilePaths(
  responses: GreptileQueryResponse[]
): string[] {
  const paths = new Set<string>();

  responses.forEach(response => {
    response.sources.forEach(source => {
      if (source.filepath) {
        paths.add(source.filepath);
      }
    });
  });

  return Array.from(paths);
}
