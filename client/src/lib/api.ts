import type { InfographicData } from '../types/infographic';

interface GenerateResponse {
  success: boolean;
  data?: InfographicData;
  error?: string;
}

export async function generateInfographic(topic: string): Promise<InfographicData> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });

  const json: GenerateResponse = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Generation failed. Please try again.');
  }

  if (!json.data) {
    throw new Error('No data returned from server.');
  }

  return json.data;
}
