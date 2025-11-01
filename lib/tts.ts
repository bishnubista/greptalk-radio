/**
 * Text-to-Speech Client - ElevenLabs Integration
 *
 * Generates podcast audio from script dialogue
 * Supports multiple voices for Greptice (dry) and Forky (excited)
 */

export interface VoiceConfig {
  greptice: string; // Voice ID for Greptice (male, dry, academic)
  forky: string;    // Voice ID for Forky (female, excited, enthusiastic)
}

export interface AudioSegment {
  speaker: 'Greptice' | 'Forky';
  text: string;
  audio: Buffer;
  duration: number; // milliseconds
}

// Default ElevenLabs voice IDs
// These are popular pre-made voices - users can override with custom voices
const DEFAULT_VOICES: VoiceConfig = {
  greptice: '21m00Tcm4TlvDq8ikWAM', // Rachel - clear, neutral, professional
  forky: 'EXAVITQu4vr4xnSDxMaL',    // Bella - warm, friendly, engaging
};

/**
 * Generate speech audio from text using ElevenLabs
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  options: {
    stability?: number;
    similarityBoost?: number;
    modelId?: string;
  } = {}
): Promise<Buffer> {
  const {
    stability = 0.5,
    similarityBoost = 0.75,
    modelId = 'eleven_monolingual_v1',
  } = options;

  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.statusText} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate audio segments for all dialogue lines
 */
export async function generateAudioSegments(
  dialogue: Array<{ speaker: 'Greptice' | 'Forky'; text: string }>,
  voices?: VoiceConfig
): Promise<AudioSegment[]> {
  const voiceConfig = voices || DEFAULT_VOICES;
  const segments: AudioSegment[] = [];

  for (const line of dialogue) {
    const voiceId = line.speaker === 'Greptice' ? voiceConfig.greptice : voiceConfig.forky;

    // Voice settings per character
    const settings = line.speaker === 'Greptice'
      ? { stability: 0.7, similarityBoost: 0.8 } // More stable, precise
      : { stability: 0.4, similarityBoost: 0.7 }; // More varied, expressive

    const audio = await generateSpeech(line.text, voiceId, settings);

    // Estimate duration (rough: 150 words per minute, average word = 5 chars)
    const words = line.text.split(/\s+/).length;
    const duration = (words / 150) * 60 * 1000; // milliseconds

    segments.push({
      speaker: line.speaker,
      text: line.text,
      audio,
      duration,
    });
  }

  return segments;
}

/**
 * Stitch audio segments into a single MP3 with pauses
 * Returns base64-encoded MP3 data
 */
export function stitchAudioSegments(segments: AudioSegment[]): string {
  // For hackathon MVP: Simple concatenation without pauses
  // In production: Use ffmpeg or audio processing library for proper stitching

  const buffers = segments.map(s => s.audio);
  const combinedBuffer = Buffer.concat(buffers);

  return combinedBuffer.toString('base64');
}

/**
 * Generate complete episode audio from script
 */
export async function generateEpisodeAudio(
  dialogue: Array<{ speaker: 'Greptice' | 'Forky'; text: string }>,
  voices?: VoiceConfig,
  onProgress?: (current: number, total: number, speaker: string) => void
): Promise<{
  audioBase64: string;
  duration: number;
  segmentCount: number;
}> {
  const segments: AudioSegment[] = [];

  for (let i = 0; i < dialogue.length; i++) {
    const line = dialogue[i];

    if (onProgress) {
      onProgress(i + 1, dialogue.length, line.speaker);
    }

    const voiceConfig = voices || DEFAULT_VOICES;
    const voiceId = line.speaker === 'Greptice' ? voiceConfig.greptice : voiceConfig.forky;

    // Voice settings per character
    const settings = line.speaker === 'Greptice'
      ? { stability: 0.7, similarityBoost: 0.8 }
      : { stability: 0.4, similarityBoost: 0.7 };

    const audio = await generateSpeech(line.text, voiceId, settings);

    const words = line.text.split(/\s+/).length;
    const duration = (words / 150) * 60 * 1000;

    segments.push({
      speaker: line.speaker,
      text: line.text,
      audio,
      duration,
    });
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
  const audioBase64 = stitchAudioSegments(segments);

  return {
    audioBase64,
    duration: Math.round(totalDuration),
    segmentCount: segments.length,
  };
}

/**
 * Get list of available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<Array<{
  voice_id: string;
  name: string;
  category?: string;
}>> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set');
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.statusText}`);
  }

  const data = await response.json();
  return data.voices || [];
}
