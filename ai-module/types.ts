export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintCategory =
  | 'road_damage'
  | 'waste_management'
  | 'drainage'
  | 'streetlights'
  | 'water_supply'
  | 'public_safety'
  | string;

export interface AIVerificationResult {
  isAuthentic: boolean;             // True if real camera photo, false if AI-generated or synthetic
  authenticityScore: number;        // 0 to 100 confidence of genuine camera capture
  aiGeneratedProbability: number;   // 0 to 100 probability of synthetic/diffusion generation
  visualSeverity: PriorityLevel;    // AI-assessed severity tier: 'Low' | 'Medium' | 'High' | 'Critical'
  severityScore: number;            // 0 to 100 calculated hazard score
  severityRationale: string[];      // Concise explanations for severity categorization
  fraudFlag: boolean;               // True if synthetic AI or spoofed
  fraudReason?: string;             // Detailed explanation if flagged
  verdict: 'VERIFIED_REAL' | 'SUSPICIOUS_AI' | 'IRRELEVANT' | 'NEEDS_INSPECTION';
  analyzedAt: string;               // ISO timestamp of verification
}

export interface VerificationRequest {
  title?: string;
  description?: string;
  category?: ComplaintCategory;
  address?: string;
  locality?: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string;
  safetyRisk?: boolean;
  photoMetadata?: any;
  photoDistanceMeters?: number | null;
  locationMatchStatus?: string;
}
