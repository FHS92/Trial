import { Router, type Request, type Response } from 'express';
import { generateInfographic } from './ai.js';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body as { topic?: string };

    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ success: false, error: 'Topic is required and must be a string.' });
      return;
    }

    const trimmedTopic = topic.trim();

    if (trimmedTopic.length === 0) {
      res.status(400).json({ success: false, error: 'Topic cannot be empty.' });
      return;
    }

    if (trimmedTopic.length > 200) {
      res.status(400).json({ success: false, error: 'Topic is too long. Please keep it under 200 characters.' });
      return;
    }

    const data = await generateInfographic(trimmedTopic);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[FactCanvas] Route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate infographic. Please try again.',
    });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    timestamp: new Date().toISOString(),
  });
});

export default router;
