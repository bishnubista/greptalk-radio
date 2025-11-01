/**
 * Episode Generation Pipeline
 *
 * Converts Greptile episode data into podcast-ready script
 * Uses LLM to create outline and dialogue between Greptice & Forky
 */

import { generateText, type LLMMessage } from './llm';
import { type EpisodeData } from './citations';
import { formatCitation, type Citation } from './github';

export interface EpisodeOutline {
  purpose: string;
  stack: string;
  hotspots: string[];
  patterns: string;
  microTask: {
    title: string;
    steps: string[];
  };
  jokes: string[];
  citations: Citation[];
}

export interface EpisodeScript {
  dialogue: Array<{
    speaker: 'Greptice' | 'Forky';
    text: string;
  }>;
  wordCount: number;
  estimatedDuration: number; // seconds
}

/**
 * Generate episode outline from Greptile data
 * Uses LLM to structure the information for podcast format
 */
export async function generateOutline(episodeData: EpisodeData): Promise<EpisodeOutline> {
  const citationsText = episodeData.citations
    .map((c, i) => `${i + 1}. ${formatCitation(c)}${c.functionName ? ` (${c.functionName})` : ''}`)
    .join('\n');

  const systemPrompt = `You are Greptice, a meticulous code analyst who creates podcast outlines.

Your role:
- Be factual and precise about code
- ALWAYS cite files with line numbers when discussing code
- Use the citations provided - never invent file paths
- Be slightly dry and academic in tone
- Focus on architectural patterns and best practices

Output a JSON object with this structure:
{
  "purpose": "1-2 sentence repo summary",
  "stack": "Key technologies and frameworks",
  "hotspots": ["3 most important files with brief explanations"],
  "patterns": "Interesting code patterns or architectural decisions",
  "microTask": {
    "title": "A 30-90 minute task for first-time contributors",
    "steps": ["Step 1", "Step 2", ... exactly 5 steps]
  },
  "jokes": ["2-3 subtle, clever observations about the code - not forced humor"]
}

CRITICAL: When mentioning code, reference the citations provided. Example:
"The server initialization in src/server.ts:L42-L77 uses dependency injection"
`;

  const userPrompt = `Create a podcast outline for this repository:

**Repository Purpose:**
${episodeData.purpose}

**Entry Points:**
${episodeData.entrypoints}

**Key Hotspots:**
${episodeData.hotspots}

**Code Patterns:**
${episodeData.patterns}

**Micro-Task Suggestion:**
${episodeData.microTask}

**Available Citations:**
${citationsText}

Generate the outline in JSON format. Ensure you use at least 3 of the citations above when discussing files.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await generateText(messages, {
    temperature: 0.7,
    maxTokens: 1500,
    model: process.env.OPENAI_API_KEY ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
  });

  // Parse JSON response
  // Try to extract JSON from markdown code blocks or raw text
  let jsonText = response.content;

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  } else {
    // Try to find JSON object with balanced braces
    const jsonMatch = jsonText.match(/\{(?:[^{}]|\{[^{}]*\})*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
  }

  const outline = JSON.parse(jsonText);

  // Add citations from original episode data
  return {
    ...outline,
    citations: episodeData.citations,
  };
}

/**
 * Generate podcast script from outline
 * Creates dialogue between Greptice (dry) and Forky (excited)
 */
export async function generateScript(outline: EpisodeOutline): Promise<EpisodeScript> {
  const systemPrompt = `You are a podcast scriptwriter creating a 3-5 minute tech podcast.

Characters:
1. Greptice (Host) - Dry, precise, academic. Cites code constantly. Think BBC documentary narrator.
2. Forky (Co-host) - Excited, asks questions, makes connections. Think enthusiastic student.

Script format:
- Start with a cold open (hook the listener in 10 seconds)
- Greptice explains the repo's purpose and architecture
- Forky asks clarifying questions and shows excitement
- Discuss hotspots with specific file citations
- Explain the code pattern found
- Greptice presents the micro-task step-by-step
- Forky encourages listeners to try it
- End with a call-to-action about creating a PR

Rules:
- 500-800 words total
- ALWAYS include file citations when discussing code (e.g., "in server.ts lines 42 through 77")
- Preserve exact file paths and line numbers from the outline
- Make it conversational but informative
- Forky should be enthusiastic but not annoying
- Include 1-2 of the jokes naturally in conversation

Output format:
GREPTICE: [dialogue]
FORKY: [dialogue]
GREPTICE: [dialogue]
...`;

  const citationsText = outline.citations
    .map((c, i) => `${i + 1}. ${formatCitation(c)}${c.functionName ? ` (${c.functionName})` : ''}`)
    .join('\n');

  const userPrompt = `Write a podcast script for this outline:

**Purpose:** ${outline.purpose}
**Stack:** ${outline.stack}
**Hotspots:** ${outline.hotspots.join(', ')}
**Pattern:** ${outline.patterns}
**Micro-Task:** ${outline.microTask.title}
Steps: ${outline.microTask.steps.join('; ')}
**Jokes:** ${outline.jokes.join('; ')}

**Citations to use:**
${citationsText}

Write a natural, engaging dialogue between Greptice and Forky. Target 600-700 words.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await generateText(messages, {
    temperature: 0.8,
    maxTokens: 2000,
    model: process.env.OPENAI_API_KEY ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
  });

  // Parse dialogue
  const dialogue = parseDialogue(response.content);
  const wordCount = dialogue.reduce((count, entry) => count + entry.text.split(/\s+/).length, 0);
  const estimatedDuration = Math.ceil((wordCount / 150) * 60); // 150 words per minute

  return {
    dialogue,
    wordCount,
    estimatedDuration,
  };
}

/**
 * Parse script text into dialogue array
 */
function parseDialogue(scriptText: string): Array<{ speaker: 'Greptice' | 'Forky'; text: string }> {
  const lines = scriptText.split('\n');
  const dialogue: Array<{ speaker: 'Greptice' | 'Forky'; text: string }> = [];

  for (const line of lines) {
    const grepticeMatch = line.match(/^GREPTICE:\s*(.+)$/i);
    const forkyMatch = line.match(/^FORKY:\s*(.+)$/i);

    if (grepticeMatch) {
      dialogue.push({ speaker: 'Greptice', text: grepticeMatch[1].trim() });
    } else if (forkyMatch) {
      dialogue.push({ speaker: 'Forky', text: forkyMatch[1].trim() });
    }
  }

  return dialogue;
}

/**
 * Validate outline has required citations
 */
export function validateOutline(outline: EpisodeOutline): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!outline.citations || outline.citations.length < 3) {
    errors.push(`Outline has only ${outline.citations?.length || 0} citations (need ≥3)`);
  }

  if (!outline.microTask || !outline.microTask.steps || outline.microTask.steps.length < 5) {
    errors.push(`Micro-task has only ${outline.microTask?.steps?.length || 0} steps (need 5)`);
  }

  if (!outline.hotspots || outline.hotspots.length < 3) {
    errors.push(`Only ${outline.hotspots?.length || 0} hotspots identified (need 3)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
