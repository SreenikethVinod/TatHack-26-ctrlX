import { Router, Request, Response } from 'express';
import { verifyAndTriageImage } from './engine.ts';

export const aiRouter = Router();

// Health check
aiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    module: 'CivicPulse AI Forensics & Severity Engine',
    model: process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : 'heuristic-fallback',
    timestamp: new Date().toISOString(),
  });
});

// Image verification & severity triage endpoint
aiRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { title, description, category, imageUrl, safetyRisk } = req.body;

    const result = await verifyAndTriageImage({
      title,
      description,
      category,
      imageUrl,
      safetyRisk: Boolean(safetyRisk),
    });

    res.json({ success: true, verification: result });
  } catch (err: any) {
    console.error('[AI Module Router] Error:', err);
    res.status(500).json({ error: 'AI verification failed', details: err?.message || String(err) });
  }
});

export default aiRouter;
