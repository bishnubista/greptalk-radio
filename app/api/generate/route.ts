import { NextResponse } from 'next/server';
import { indexRepository, waitForIndexing } from '@/lib/greptile';
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
      console.log('Generating audio with TTS...');
      try {
        const audioResult = await generateEpisodeAudio(
          script.dialogue,
          undefined,
          (current, total, speaker) => {
            console.log(`Generating audio segment ${current}/${total} (${speaker})`);
          }
        );
        audio = {
          base64: audioResult.audioBase64,
          duration: audioResult.duration,
          segmentCount: audioResult.segmentCount,
        };
      } catch (audioError) {
        console.error('Audio generation failed:', audioError);
        // Continue without audio rather than failing the whole request
      }
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

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate episode',
      },
      { status: 500 }
    );
  }
}
