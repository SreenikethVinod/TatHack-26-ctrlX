/**
 * CivicPulse AI Forensics & Severity Module
 *
 * Self-contained module providing:
 * 1. Image Authenticity Forensics (Real vs AI/Synthetic diffusion detection)
 * 2. Visual Municipal Severity Triage (Low, Medium, High, Critical)
 * 3. Standalone microservice, Express router, Client SDK, and React UI card.
 */

export * from './types.ts';
export { verifyAndTriageImage } from './engine.ts';
export { aiRouter } from './router.ts';
export { aiClient, CivicAIClient } from './client.ts';
export { AIVerifierCard } from './AIVerifierCard.tsx';
