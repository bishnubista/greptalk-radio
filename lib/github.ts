/**
 * GitHub API Client - Citation Fallback
 *
 * Purpose: Greptile doesn't return line numbers (linestart/lineend)
 * This module fetches file contents and finds line numbers for citations
 *
 * See: GREPTILE_TEST_RESULTS.md - "No line numbers in citation format"
 */

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string; // Base64 encoded
  encoding: string;
}

export interface Citation {
  filepath: string;
  lineStart?: number;
  lineEnd?: number;
  functionName?: string;
  summary?: string;
}

/**
 * Fetch file contents from GitHub
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }

  const data: GitHubFileContent = await response.json();

  // Decode base64 content
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return content;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find line numbers for a function/class/pattern in file content
 * Returns start and end line numbers
 */
export function findLineNumbers(
  content: string,
  searchTerm: string
): { start: number; end: number } | null {
  const lines = content.split('\n');

  // Escape special regex characters to prevent injection
  const escapedTerm = escapeRegex(searchTerm);

  // Try to find function/class definition
  const patterns = [
    new RegExp(`^\\s*(function|const|let|var)\\s+${escapedTerm}`, 'm'),
    new RegExp(`^\\s*class\\s+${escapedTerm}`, 'm'),
    new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${escapedTerm}`, 'm'),
    new RegExp(`^\\s*${escapedTerm}\\s*[:=]`, 'm'), // Arrow functions, object methods
  ];

  for (const pattern of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        const start = i + 1; // Line numbers are 1-indexed
        const end = findBlockEnd(lines, i);
        return { start, end };
      }
    }
  }

  // If not found, try simple substring search
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchTerm)) {
      const start = i + 1;
      // Return a small range (5 lines) around the match
      const end = Math.min(start + 4, lines.length);
      return { start, end };
    }
  }

  return null;
}

/**
 * Find the end of a code block (function, class, etc.)
 * Simple heuristic: look for closing brace with matching brace count
 */
function findBlockEnd(lines: string[], startIndex: number): number {
  let braceCount = 0;
  let inBlock = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // Count braces
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        inBlock = true;
      } else if (char === '}') {
        braceCount--;
        if (inBlock && braceCount === 0) {
          return i + 1; // Return 1-indexed line number
        }
      }
    }

    // If no braces found within 50 lines, assume short function
    if (i - startIndex > 50) {
      return Math.min(startIndex + 20, lines.length);
    }
  }

  // Default: return 20 lines from start
  return Math.min(startIndex + 20, lines.length);
}

/**
 * Enrich citation with line numbers from GitHub
 * If line numbers can't be found, returns filepath only
 */
export async function enrichCitation(
  owner: string,
  repo: string,
  filepath: string,
  branch: string,
  searchTerms?: string[]
): Promise<Citation> {
  try {
    // Skip binary files and very large files
    if (
      filepath.match(/\.(jpg|jpeg|png|gif|pdf|zip|tar|gz|mp3|mp4|woff|ttf)$/i)
    ) {
      return { filepath, summary: 'Binary file (skipped)' };
    }

    const content = await fetchFileContent(owner, repo, filepath, branch);

    // If file is too large (>1MB), skip line number extraction
    if (content.length > 1024 * 1024) {
      return {
        filepath,
        summary: 'Large file (>1MB, line numbers skipped)',
      };
    }

    // Try to find line numbers for search terms
    if (searchTerms && searchTerms.length > 0) {
      for (const term of searchTerms) {
        const lineNumbers = findLineNumbers(content, term);
        if (lineNumbers) {
          return {
            filepath,
            lineStart: lineNumbers.start,
            lineEnd: lineNumbers.end,
            functionName: term,
          };
        }
      }
    }

    // If no search terms or not found, return just filepath
    return { filepath };
  } catch (error) {
    console.error(`Failed to enrich citation for ${filepath}:`, error);
    return {
      filepath,
      summary: 'Unable to fetch (may be invalid path)',
    };
  }
}

/**
 * Parse GitHub URL into owner and repo
 * Supports: https://github.com/owner/repo or github.com/owner/repo
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  branch?: string;
} | null {
  const patterns = [
    /^https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)(\/tree\/([^\/]+))?/,
    /^github\.com\/([^\/]+)\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // Extract owner and repo, clean trailing .git if present
      const owner = match[2] || match[1];
      const repo = (match[3] || match[2]).replace(/\.git$/, '');
      const branch = match[5]; // Optional branch from /tree/<branch>
      return { owner, repo, branch };
    }
  }

  return null;
}

/**
 * Validate that a file path exists in the repository
 */
export async function validateFilePath(
  owner: string,
  repo: string,
  filepath: string,
  branch: string = 'main'
): Promise<boolean> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}?ref=${branch}`;

    const response = await fetch(url, {
      method: 'HEAD', // Just check if it exists
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Format citation for display
 * e.g., "src/server.ts:L42-L77" or just "src/server.ts"
 */
export function formatCitation(citation: Citation): string {
  if (citation.lineStart && citation.lineEnd) {
    return `${citation.filepath}:L${citation.lineStart}-L${citation.lineEnd}`;
  }
  return citation.filepath;
}
