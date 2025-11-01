'use client';

import { useState } from 'react';

interface Citation {
  filepath: string;
  lineStart?: number;
  lineEnd?: number;
  functionName?: string;
  summary?: string;
}

interface DialogueLine {
  speaker: 'Greptice' | 'Forky';
  text: string;
}

interface EpisodeData {
  repository: string;
  branch: string;
  purpose: string;
  entrypoints: string;
  hotspots: string;
  patterns: string;
  microTask: string;
  citations: Citation[];
  citationCount: number;
  script?: {
    dialogue: DialogueLine[];
    wordCount: number;
    estimatedDuration: number;
  };
  audio?: {
    base64: string;
    duration: number;
    segmentCount: number;
  } | null;
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [includeAudio, setIncludeAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null);

  const handleGenerate = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    // Basic GitHub URL validation
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubUrlPattern.test(repoUrl.trim())) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }

    setError('');
    setEpisodeData(null);
    setIsLoading(true);
    setProgress('Indexing repository with Greptile...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          includeAudio,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate episode');
      }

      setProgress('✓ Episode data generated!');
      setEpisodeData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCitation = (citation: Citation): string => {
    if (citation.lineStart && citation.lineEnd) {
      return `${citation.filepath}:L${citation.lineStart}-L${citation.lineEnd}`;
    }
    return citation.filepath;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col gap-8 items-center max-w-4xl w-full">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            Greptalk: Repo Radio
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Talk to a repo as a podcast
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="repo-url" className="block text-sm font-medium mb-2">
                GitHub Repository URL
              </label>
              <input
                id="repo-url"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Progress Message */}
            {isLoading && progress && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{progress}</p>
                </div>
              </div>
            )}

            {/* Audio Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include-audio"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="include-audio" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Generate audio with TTS (ElevenLabs - slower, requires API key)
              </label>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? 'Generating...' : 'Generate Episode'}
            </button>

            {/* Example */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Example:</strong> https://github.com/vercel/next.js
              </p>
            </div>
          </div>
        </div>

        {/* Episode Data Display */}
        {episodeData && (
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-2xl font-bold">Episode Data</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {episodeData.repository} ({episodeData.branch})
              </span>
            </div>

            {/* Citations */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Citations ({episodeData.citationCount})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                {episodeData.citations.map((citation, i) => (
                  <div
                    key={`${citation.filepath}-${citation.lineStart || i}`}
                    className="flex items-start gap-2"
                  >
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">
                      {i + 1}.
                    </span>
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {formatCitation(citation)}
                      {citation.functionName && (
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          ({citation.functionName})
                        </span>
                      )}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Purpose</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {episodeData.purpose}
              </p>
            </div>

            {/* Hotspots */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Key Hotspots</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {episodeData.hotspots}
              </p>
            </div>

            {/* Patterns */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Code Patterns</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {episodeData.patterns}
              </p>
            </div>

            {/* Micro-Task */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-2">Micro-Task for Contributors</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {episodeData.microTask}
              </p>
            </div>

            {/* Audio Player */}
            {episodeData.audio && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Episode Audio</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {episodeData.audio.segmentCount} segments · {Math.floor(episodeData.audio.duration / 60000)}:{String(Math.floor((episodeData.audio.duration % 60000) / 1000)).padStart(2, '0')} min
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  <audio
                    controls
                    className="w-full"
                    src={`data:audio/mpeg;base64,${episodeData.audio.base64}`}
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`data:audio/mpeg;base64,${episodeData.audio.base64}`}
                      download={`${episodeData.repository.replace('/', '-')}-episode.mp3`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Download MP3
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Podcast Script */}
            {episodeData.script && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Podcast Script</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {episodeData.script.wordCount} words · ~{Math.floor(episodeData.script.estimatedDuration / 60)}:{String(episodeData.script.estimatedDuration % 60).padStart(2, '0')} min
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
                  {episodeData.script.dialogue.map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            line.speaker === 'Greptice'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}
                        >
                          {line.speaker}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 flex-1">
                        {line.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Phase 0.4:</strong> TTS Audio Generation Complete!
                <br />
                <strong>Features:</strong> ElevenLabs multi-voice TTS, Base64 audio embedding, MP3 download
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Phase 0.4: TTS Audio Generation with ElevenLabs
        </p>
      </main>
    </div>
  );
}
