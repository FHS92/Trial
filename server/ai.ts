import { GoogleGenerativeAI } from '@google/generative-ai';
import { InfographicSchema, SCHEMA_DESCRIPTION, type InfographicData } from './schema.js';
import { getMockData } from './mockData.js';

const today = new Date().toISOString().split('T')[0];

const SYSTEM_PROMPT = `You are a world-class factual infographic research assistant. Your job is to produce concise, accurate, high-signal infographic data for any topic.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no backticks, no commentary before or after
2. All facts must be real and verifiable — never fabricate statistics
3. All sourceRef values must exactly match an id in the sources array
4. Keep body text concise (2-4 sentences max per factSection)
5. Prioritize numbers, percentages, dates, and comparisons over prose
6. Include real, legitimate URLs for sources (major institutions, news, government, research)
7. The lastResearched field must be: ${today}
8. confidenceScore should reflect how well-established the facts are (0.7-0.95 for most topics)
9. Choose theme: "midnight-data" for science/tech/data topics, "editorial-light" for historical/cultural/business topics`;

const USER_PROMPT = (topic: string) => `Generate a comprehensive infographic JSON for the topic: "${topic}"

The JSON must exactly match this schema:
${SCHEMA_DESCRIPTION}

Requirements:
- Title: concise, factual (4-7 words max)
- Subtitle: one compelling descriptive phrase
- Summary: 1-2 sentence factual overview with key impact statement
- keyStats: 5-8 stats with real numbers, units, and context
- factSections: 3-6 sections covering different aspects of the topic
- timeline: include 5-8 entries if the topic has historical context, otherwise []
- comparisons: include 1-3 comparisons if comparing entities/values makes sense, otherwise []
- charts: include 1-2 charts with real data if numerical comparisons are meaningful, otherwise []
- sources: 3-6 real, authoritative sources with legitimate URLs
- Every sourceRef must map to a real source id in the sources array

Return ONLY the JSON object. No other text.`;

export async function generateInfographic(topic: string): Promise<InfographicData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('[FactCanvas] No GEMINI_API_KEY found — returning demo data');
    return getMockData(topic);
  }

  try {
    console.log(`[FactCanvas] Generating infographic for topic: "${topic}"`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(USER_PROMPT(topic));
    const rawText = result.response.text();

    console.log('[FactCanvas] Raw AI response length:', rawText.length);

    // Clean up response (remove potential markdown wrappers)
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[FactCanvas] JSON parse error, attempting repair...');
      // Try to extract JSON from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract valid JSON from AI response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate and coerce with Zod
    const validated = InfographicSchema.parse(parsed);
    console.log('[FactCanvas] Successfully validated infographic schema');
    return validated;
  } catch (error) {
    console.error('[FactCanvas] Generation failed, using demo data:', error instanceof Error ? error.message : error);
    const mockData = getMockData(topic);
    // Add a note that this is fallback data
    return {
      ...mockData,
      subtitle: mockData.subtitle + ' (Demo Mode)',
    };
  }
}
