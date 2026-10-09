export type ComplaintCategory =
  | 'road_damage'
  | 'waste_management'
  | 'drainage'
  | 'streetlights'
  | 'water_supply'
  | 'public_safety'
  | 'other';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface PriorityCalculationInput {
  category: ComplaintCategory | string;
  title?: string;
  description?: string;
  safetyRisk?: boolean;
  votesCount?: number;
  createdAt?: string;
  status?: string;
  address?: string;
  locality?: string;
  attachmentsCount?: number;
  photoMetadata?: any;
  photoDistanceMeters?: number;
  locationMatchStatus?: string;
  explicitSeverity?: number; // Optional 0-100 override
  explicitLocationImportance?: number; // Optional 0-100 override
}

export interface PriorityBreakdown {
  severity: number;
  age: number;
  safetyRisk: number;
  corroboration: number;
  locationImportance: number;
  weights: {
    S: number;
    A: number;
    R: number;
    V: number;
    L: number;
  };
}

export interface PriorityRecommendation {
  recommendedPriority: PriorityLevel;
  slaHours: number;
  rationale: string[];
  score: number;
  breakdown: PriorityBreakdown;
}

const CATEGORY_SEVERITY: Record<string, number> = {
  public_safety: 90,
  water_supply: 80,
  road_damage: 75,
  drainage: 70,
  waste_management: 60,
  streetlights: 50,
  other: 55,
};

/**
 * Normalises input to 0-100 scale safely.
 */
function clamp(val: number, min = 0, max = 100): number {
  if (isNaN(val)) return 0;
  return Math.min(max, Math.max(min, val));
}

/**
 * Transparent, explainable priority scoring service:
 * Formula: P = 0.35S + 0.20A + 0.20R + 0.15V + 0.10L
 */
export function calculatePriorityScore(input: PriorityCalculationInput): PriorityRecommendation {
  const rationale: string[] = [];

  // S: Severity (0-100)
  let S: number;
  if (typeof input.explicitSeverity === 'number') {
    S = clamp(input.explicitSeverity);
    rationale.push(`Severity (S=${S.toFixed(1)}/100): Direct municipal inspection severity rating.`);
  } else {
    S = CATEGORY_SEVERITY[input.category] ?? 50;
    rationale.push(`Severity (S=${S}/100): Baseline hazard for ${input.category} category.`);
  }

  // A: Age (0-100) - 120 hours (5 days) corresponds to 100
  let A = 0;
  if (input.createdAt) {
    const createdMs = new Date(input.createdAt).getTime();
    const nowMs = Date.now();
    const hoursElapsed = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60));
    A = clamp((hoursElapsed / 120) * 100);
    rationale.push(`Age (A=${A.toFixed(1)}/100): ${Math.round(hoursElapsed)} hours elapsed since submission.`);
  } else {
    rationale.push(`Age (A=0/100): Newly submitted issue.`);
  }

  // R: Safety Risk (0-100)
  const R = input.safetyRisk ? 100 : 0;
  if (input.safetyRisk) {
    rationale.push(`Safety Risk (R=100/100): Citizen flagged immediate danger to public safety or bodily hazard.`);
  } else {
    rationale.push(`Safety Risk (R=0/100): No direct acute injury hazard flagged.`);
  }

  // V: Corroborating reports & evidence (0-100)
  const votes = Math.max(1, input.votesCount || 1);
  const attachments = input.attachmentsCount || 1;
  const V = clamp(votes * 3 + attachments * 10);
  rationale.push(`Corroboration (V=${V.toFixed(1)}/100): ${votes} citizen endorsements & ${attachments} verified evidence items.`);

  // L: Location Importance (0-100)
  let L = 50;
  if (typeof input.explicitLocationImportance === 'number') {
    L = clamp(input.explicitLocationImportance);
    rationale.push(`Location (L=${L.toFixed(1)}/100): Configured zone priority.`);
  } else {
    const locText = `${input.address || ''} ${input.locality || ''}`.toLowerCase();
    if (
      locText.includes('school') ||
      locText.includes('hospital') ||
      locText.includes('market') ||
      locText.includes('transit') ||
      locText.includes('station') ||
      locText.includes('highway')
    ) {
      L = 85;
      rationale.push(`Location (L=85/100): Critical public access zone (school, hospital, transit, or marketplace detected).`);
    } else if (locText.includes('downtown') || locText.includes('central')) {
      L = 70;
      rationale.push(`Location (L=70/100): High-density municipal sector.`);
    } else {
      L = 40;
      rationale.push(`Location (L=40/100): Standard municipal zone.`);
    }
  }

  // Formula: P = 0.35S + 0.20A + 0.20R + 0.15V + 0.10L
  const weights = { S: 0.35, A: 0.20, R: 0.20, V: 0.15, L: 0.10 };
  const rawScore = weights.S * S + weights.A * A + weights.R * R + weights.V * V + weights.L * L;
  const score = Math.round(clamp(rawScore) * 10) / 10;

  // Determine Level and SLA
  let recommendedPriority: PriorityLevel;
  let slaHours: number;

  if (score >= 68 || (R === 100 && S >= 75)) {
    recommendedPriority = 'Critical';
    slaHours = 24;
  } else if (score >= 48) {
    recommendedPriority = 'High';
    slaHours = 48;
  } else if (score >= 28) {
    recommendedPriority = 'Medium';
    slaHours = 72;
  } else {
    recommendedPriority = 'Low';
    slaHours = 120;
  }

  rationale.push(
    `Overall Weighted Priority: ${score}/100 -> Recommended ${recommendedPriority} with ${slaHours}h Target SLA.`
  );

  return {
    recommendedPriority,
    slaHours,
    rationale,
    score,
    breakdown: {
      severity: S,
      age: A,
      safetyRisk: R,
      corroboration: V,
      locationImportance: L,
      weights,
    },
  };
}

// Backwards compatibility wrapper for existing priorityEngine exports
export function calculateSmartPriority(input: {
  category: ComplaintCategory;
  safetyRisk: boolean;
  votesCount: number;
  createdAt: string;
  status: string;
}): PriorityRecommendation {
  return calculatePriorityScore(input);
}
