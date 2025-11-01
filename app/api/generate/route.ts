import { NextResponse } from 'next/server';
import { indexRepository, waitForIndexing } from '@/lib/greptile';
import { parseGitHubUrl } from '@/lib/github';
import { generateEpisodeData, validateEpisodeData } from '@/lib/citations';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Vercel

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Parse and validate GitHub URL
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL. Format: https://github.com/owner/repo' },
        { status: 400 }
      );
    }

    const { owner, repo, branch = 'main' } = parsed;

    // Create Greptile repository object
    const greptileRepo = {
      remote: 'github' as const,
      repository: `${owner}/${repo}`,
      branch,
    };

    // Step 1: Index repository
    console.log(`Indexing repository: ${owner}/${repo}...`);
    await indexRepository(greptileRepo);

    // Step 2: Wait for indexing to complete (55s to stay within 60s API timeout)
    console.log('Waiting for indexing to complete...');
    await waitForIndexing(greptileRepo, 55000, (status, filesProcessed) => {
      console.log(`Status: ${status}, Files: ${filesProcessed}`);
    });

    // Step 3: Generate episode data (queries + citations)
    console.log('Generating episode data...');
    const episodeData = await generateEpisodeData(repoUrl, (step, message) => {
      console.log(`Step ${step}: ${message}`);
    });

    // Step 4: Validate episode data
    const validation = validateEpisodeData(episodeData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Episode validation failed',
          details: validation.errors,
        },
        { status: 422 }
      );
    }

    // Return episode data
    return NextResponse.json({
      success: true,
      data: {
        repository: `${owner}/${repo}`,
        branch,
        purpose: episodeData.purpose,
        entrypoints: episodeData.entrypoints,
        hotspots: episodeData.hotspots,
        patterns: episodeData.patterns,
        microTask: episodeData.microTask,
        citations: episodeData.citations,
        citationCount: episodeData.citations.length,
      },
    });
  } catch (error) {
    console.error('Episode generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate episode',
      },
      { status: 500 }
    );
  }
}
