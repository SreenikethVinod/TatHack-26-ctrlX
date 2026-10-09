import { Router, Request, Response } from 'express';
import { verifyAndTriageImage } from './engine.ts';
import { GoogleGenAI } from '@google/genai';

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

// ─────────────────────────────────────────────────────
// Natural Language Chat — "Ask CivicPulse AI"
// Pulls live complaint snapshot from DB and answers with Gemini
// ─────────────────────────────────────────────────────
aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message: string };
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // Pull live stats from DB via the main server's internal API (same process)
    let dataContext = 'No live data available.';
    try {
      // Dynamic import to avoid circular deps — works since everything is same process
      const { db } = await import('../server/db.ts');
      const complaints = db.getComplaints({});
      const total = complaints.length;
      const resolved = complaints.filter((c: any) => c.status === 'resolved').length;
      const critical = complaints.filter((c: any) => c.priority === 'Critical').length;
      const escalated = complaints.filter((c: any) => c.status === 'escalated').length;
      const inProgress = complaints.filter((c: any) => c.status === 'in_progress').length;
      const unacked = complaints.filter((c: any) => c.status === 'submitted').length;

      // Category breakdown
      const catCounts: Record<string, number> = {};
      complaints.forEach((c: any) => {
        catCounts[c.category] = (catCounts[c.category] || 0) + 1;
      });
      const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

      // Avg resolution time
      const resolvedWithTime = complaints.filter(
        (c: any) => c.status === 'resolved' && c.resolvedAt && c.createdAt
      );
      let avgResolutionHrs = 'N/A';
      if (resolvedWithTime.length > 0) {
        const avgMs =
          resolvedWithTime.reduce((sum: number, c: any) => {
            return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
          }, 0) / resolvedWithTime.length;
        avgResolutionHrs = `${(avgMs / 3600000).toFixed(1)} hours`;
      }

      // Recent 5 complaints summary
      const recent = complaints
        .slice(0, 5)
        .map(
          (c: any) =>
            `- [${c.reference || c.id}] ${c.title} | ${c.category} | ${c.priority} | ${c.status}`
        )
        .join('\n');

      dataContext = `
LIVE CIVICPULSE DATABASE SNAPSHOT (${new Date().toLocaleString()}):
- Total complaints: ${total}
- Resolved: ${resolved} (${total > 0 ? Math.round((resolved / total) * 100) : 0}%)
- Critical priority: ${critical}
- Escalated to District: ${escalated}
- In Progress: ${inProgress}
- Awaiting acknowledgement: ${unacked}
- Top complaint category: ${topCategory ? `${topCategory[0]} (${topCategory[1]} reports)` : 'N/A'}
- Avg resolution time: ${avgResolutionHrs}
- Category breakdown: ${JSON.stringify(catCounts)}

RECENT COMPLAINTS:
${recent}
      `.trim();
    } catch (dbErr) {
      console.warn('[AI Chat] Could not load DB context:', dbErr);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback without Gemini
      return res.json({
        reply: `📊 **Live Data Snapshot:**\n\n${dataContext}\n\n_Gemini API key not configured — set GEMINI_API_KEY to enable natural language answers._`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = `You are CivicPulse AI, a helpful assistant embedded in CivicPulse — a civic issue reporting & municipal governance platform for Indian cities.

You have access to real-time data from the platform's SQLite database. Answer questions concisely and helpfully. Use markdown bold (**text**) for important numbers or terms.
Keep answers under 120 words unless the user asks for detail.
Never make up data — only use what is provided in the context.

${dataContext}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }] }],
    });

    const reply = response.text?.trim() || 'I could not generate a response. Please try again.';
    res.json({ success: true, reply });
  } catch (err: any) {
    console.error('[AI Chat] Error:', err);
    res.status(500).json({ error: 'Chat failed', reply: '⚠️ AI service error. Please try again.' });
  }
});

export default aiRouter;

