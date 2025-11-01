import { NextResponse } from 'next/server';
import { indexRepository, waitForIndexing, checkIndexStatus } from '@/lib/greptile';
import { parseGitHubUrl } from '@/lib/github';
import { generateEpisodeData, validateEpisodeData } from '@/lib/citations';
import { generateOutline, generateScript, validateOutline } from '@/lib/episode';
import { generateEpisodeAudio } from '@/lib/tts';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Vercel

export async function POST(request: Request) {
  try {
    const { repoUrl, includeAudio = false } = await request.json();

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

    // Environment-based timeout configuration
    // Local: 10 minutes (600s) for large repos
    // Vercel: 55 seconds to stay within 60s limit
    const isLocal = !process.env.VERCEL;
    const indexTimeout = isLocal ? 600000 : 55000;

    // Step 1: Check if repository is already indexed
    console.log(`Checking index status for ${owner}/${repo}...`);
    const initialStatus = await checkIndexStatus(greptileRepo);
    const statusLower = initialStatus.status.toLowerCase();

    if (statusLower === 'completed') {
      console.log('Repository already indexed, skipping indexing step');
    } else if (statusLower === 'failed') {
      console.log('Previous indexing failed, re-indexing repository...');
      await indexRepository(greptileRepo);
    } else if (statusLower === 'processing' || statusLower === 'submitted') {
      console.log('Repository currently indexing, waiting for completion...');
    } else {
      // Not indexed yet, start indexing
      console.log(`Indexing repository: ${owner}/${repo}...`);
      await indexRepository(greptileRepo);
    }

    // Step 2: Wait for indexing to complete with environment-based timeout
    if (statusLower !== 'completed') {
      console.log(`Waiting for indexing to complete (max ${indexTimeout / 1000}s)...`);
      await waitForIndexing(greptileRepo, indexTimeout, (status, filesProcessed) => {
        console.log(`Status: ${status}, Files: ${filesProcessed}`);
      });
    }

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

    // Step 5: Generate episode outline using LLM
    console.log('Generating episode outline...');
    const outline = await generateOutline(episodeData);

    // Validate outline
    const outlineValidation = validateOutline(outline);
    if (!outlineValidation.valid) {
      return NextResponse.json(
        {
          error: 'Outline validation failed',
          details: outlineValidation.errors,
        },
        { status: 422 }
      );
    }

    // Step 6: Generate podcast script
    console.log('Generating podcast script...');
    const script = await generateScript(outline);

    // Step 7: Generate audio (optional, can be slow)
    let audio = null;
    if (includeAudio && process.env.ELEVENLABS_API_KEY) {
      console.log(`Generating audio with TTS... (${script.dialogue.length} dialogue segments)`);
      console.log('ElevenLabs API key is set:', !!process.env.ELEVENLABS_API_KEY);
      try {
        const audioResult = await generateEpisodeAudio(
          script.dialogue,
          undefined,
          (current, total, speaker) => {
            console.log(`Generating audio segment ${current}/${total} (${speaker})`);
          }
        );
        console.log(`Audio generation complete: ${audioResult.segmentCount} segments, ${audioResult.duration}ms`);
        audio = {
          base64: audioResult.audioBase64,
          duration: audioResult.duration,
          segmentCount: audioResult.segmentCount,
        };
      } catch (audioError) {
        console.error('Audio generation failed:', audioError);
        // Continue without audio rather than failing the whole request
      }
    } else if (includeAudio && !process.env.ELEVENLABS_API_KEY) {
      console.warn('Audio generation requested but ELEVENLABS_API_KEY is not set');
    }

    // Return complete episode
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
        outline,
        script: {
          dialogue: script.dialogue,
          wordCount: script.wordCount,
          estimatedDuration: script.estimatedDuration,
        },
        audio,
      },
    });
  } catch (error) {
    console.error('Episode generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate episode';

    // Return 408 Request Timeout for indexing timeouts
    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        {
          error: errorMessage,
          suggestion: 'The repository is taking longer than expected to index. Please try again in a few minutes, or try a smaller repository.',
        },
        { status: 408 }
      );
    }

    // Return 500 for other errors
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
