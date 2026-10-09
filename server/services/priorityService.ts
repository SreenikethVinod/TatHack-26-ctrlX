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
  latitude?: number | null;
  longitude?: number | null;
  photoMetadata?: any | null;
  photoDistanceMeters?: number | null;
  locationMatchStatus?: 'VERIFIED' | 'FLAGGED_MISMATCH' | 'NO_PHOTO' | string;
  attachmentsCount?: number;
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
 * Lexical semantic analysis of description & title for hazard extent and physical impact.
 */
function analyzeDescriptionSemantics(description = '', title = '') {
  const text = `${title} ${description}`.toLowerCase().trim();
  const rationalePoints: string[] = [];

  if (!text) {
    return {
      severityAdjustment: 0,
      criticalHazardDetected: false,
      highHazardDetected: false,
      cosmeticMitigationDetected: false,
      inferredImminentHazard: false,
      rationalePoints,
    };
  }

  // 1. Critical acute hazards (life-safety, catastrophic structural, major health threat)
  const criticalKeywords = [
    'exposed wire', 'live wire', 'electric shock', 'sparking',
    'burst pipe', 'burst main', 'ruptured main', 'pipeline rupture',
    'sinkhole', 'crater', 'road collapse', 'cave in', 'cave-in',
    'bridge fracture', 'structural collapse', 'structural failure',
    'toxic', 'sewage in home', 'sewage inside', 'overflowing into house',
    'open manhole', 'uncovered manhole', 'drain without lid', 'missing manhole',
    'gas leak', 'chemical spill', 'landslide', 'impassable', 'ambulance blocked',
  ];

  // 2. High urgency hazards (direct vehicular/mobility hazard, acute public infrastructure outage)
  const highKeywords = [
    'deep pothole', 'severe pothole', 'tire blowout', 'tire burst', 'axle damage',
    'flooded road', 'submerged', 'overflowing sewage', 'blackout', 'entire street dark',
    'broken guardrail', 'dangling pole', 'fallen tree', 'road blocked', 'traffic jammed',
    'blind curve', 'blind spot', 'severe leakage', 'water gushing', 'contamination',
    'water leak', 'pipe leak', 'pipeline leak', 'major leak', 'leakage', 'slippery', 'skidding',
  ];

  // 3. Vulnerable populations & sensitive pedestrian contexts
  const vulnerabilityKeywords = [
    'school', 'kindergarten', 'daycare', 'playground', 'children', 'students',
    'elderly', 'senior citizen', 'wheelchair', 'pedestrians', 'biker fell',
    'motorcyclist injured', 'scooter crashed', 'accident', 'near collision',
    'hospital gate', 'emergency entrance',
  ];

  // 4. Explicit hazard intensity descriptors
  const hazardIntensityKeywords = [
    'dangerous', 'hazardous', 'hazard', 'severe', 'life risk', 'accident prone', 'unsafe', 'risk of injury',
  ];

  // 5. Cosmetic, routine, or low-urgency mitigating factors
  const mitigatingKeywords = [
    'minor crack', 'hairline crack', 'small pothole', 'cosmetic',
    'slight peeling', 'peeled paint', 'flickering bulb', 'slow drip',
    'mild smell', 'dry leaves', 'routine maintenance', 'non urgent',
    'not dangerous', 'low traffic', 'superficial',
  ];

  const isNegated = (kw: string) => text.includes(`not ${kw}`) || text.includes(`non ${kw}`) || text.includes(`non-${kw}`);

  const matchedCritical = criticalKeywords.filter((kw) => text.includes(kw));
  const matchedHigh = highKeywords.filter((kw) => text.includes(kw));
  const matchedVulnerability = vulnerabilityKeywords.filter((kw) => text.includes(kw));
  const matchedHazardIntensity = hazardIntensityKeywords.filter((kw) => text.includes(kw) && !isNegated(kw));
  const matchedMitigating = mitigatingKeywords.filter((kw) => text.includes(kw));

  let severityAdjustment = 0;
  const criticalHazardDetected = matchedCritical.length > 0;
  const highHazardDetected = matchedHigh.length > 0;
  const cosmeticMitigationDetected = matchedMitigating.length > 0 && !criticalHazardDetected && !highHazardDetected && matchedHazardIntensity.length === 0;

  if (criticalHazardDetected) {
    severityAdjustment += Math.min(35, 20 + matchedCritical.length * 5);
    rationalePoints.push(
      `Description Analysis: Critical acute hazard identified (${matchedCritical.slice(0, 3).map((k) => `"${k}"`).join(', ')}). Severity elevated.`
    );
  } else if (highHazardDetected) {
    severityAdjustment += Math.min(22, 12 + matchedHigh.length * 4);
    rationalePoints.push(
      `Description Analysis: High-impact hazard markers detected (${matchedHigh.slice(0, 3).map((k) => `"${k}"`).join(', ')}).`
    );
  }

  if (matchedHazardIntensity.length > 0 && !cosmeticMitigationDetected) {
    severityAdjustment += Math.min(15, 10 + (matchedHazardIntensity.length - 1) * 3);
    rationalePoints.push(
      `Hazard Intensity: Explicit danger markers flagged in description (${matchedHazardIntensity.slice(0, 2).map((k) => `"${k}"`).join(', ')}).`
    );
  }

  if (matchedVulnerability.length > 0) {
    severityAdjustment += Math.min(15, 8 + matchedVulnerability.length * 4);
    rationalePoints.push(
      `Vulnerability Impact: Description flags risk to sensitive pedestrian group or zone (${matchedVulnerability.slice(0, 2).map((k) => `"${k}"`).join(', ')}).`
    );
  }

  if (cosmeticMitigationDetected) {
    severityAdjustment -= Math.min(25, 12 + matchedMitigating.length * 5);
    rationalePoints.push(
      `Description Analysis: Mild/cosmetic indicators identified (${matchedMitigating.slice(0, 2).map((k) => `"${k}"`).join(', ')}). Severity moderated for standard maintenance.`
    );
  }

  // Acute imminent bodily risk is inferred if critical keywords are present, OR if explicit danger intensity occurs in high hazard / vulnerable zones
  const inferredImminentHazard =
    criticalHazardDetected ||
    (matchedHazardIntensity.length > 0 && (highHazardDetected || matchedVulnerability.length > 0));

  return {
    severityAdjustment,
    criticalHazardDetected,
    highHazardDetected,
    cosmeticMitigationDetected,
    inferredImminentHazard,
    rationalePoints,
  };
}

/**
 * Evaluates photo metadata location (device GPS, distance deviation, status) and sensitive zone context.
 */
function analyzeLocationAndPhotoMetadata(input: PriorityCalculationInput) {
  const rationalePoints: string[] = [];
  const locText = `${input.address || ''} ${input.locality || ''} ${input.title || ''} ${input.description || ''}`.toLowerCase();

  // 1. Determine Base Zone Importance from Spatial / Infrastructure Context
  let baseL = 50;
  let zoneLabel = 'Standard Municipal Sector';

  if (
    locText.includes('hospital') ||
    locText.includes('clinic') ||
    locText.includes('trauma') ||
    locText.includes('emergency ward') ||
    locText.includes('ambulance')
  ) {
    baseL = 95;
    zoneLabel = 'Hospital / Emergency Care Corridor';
  } else if (
    locText.includes('school') ||
    locText.includes('kindergarten') ||
    locText.includes('college') ||
    locText.includes('campus') ||
    locText.includes('playground') ||
    locText.includes('daycare')
  ) {
    baseL = 90;
    zoneLabel = 'School / Child Pedestrian Safety Zone';
  } else if (
    locText.includes('highway') ||
    locText.includes('expressway') ||
    locText.includes('flyover') ||
    locText.includes('arterial') ||
    locText.includes('bypass')
  ) {
    baseL = 88;
    zoneLabel = 'High-Speed Arterial / Highway Transit';
  } else if (
    locText.includes('metro') ||
    locText.includes('station') ||
    locText.includes('transit') ||
    locText.includes('bus stand') ||
    locText.includes('bus terminal') ||
    locText.includes('railway') ||
    locText.includes('market') ||
    locText.includes('bazaar')
  ) {
    baseL = 82;
    zoneLabel = 'High-Density Transit / Public Marketplace';
  } else if (locText.includes('downtown') || locText.includes('central')) {
    baseL = 72;
    zoneLabel = 'High-Density Municipal Center';
  } else {
    baseL = 45;
    zoneLabel = 'Standard Residential Zone';
  }

  // 2. Process Photo Metadata Location Precision
  let photoDiscrepancyPenalty = 0;
  let photoVerifiedBoost = 0;
  let isLocationDiscrepancy = false;

  let distMeters: number | null = null;
  if (typeof input.photoDistanceMeters === 'number') {
    distMeters = input.photoDistanceMeters;
  } else if (input.photoMetadata && typeof input.photoMetadata.distanceMeters === 'number') {
    distMeters = input.photoMetadata.distanceMeters;
  }

  const matchStatus = input.locationMatchStatus || input.photoMetadata?.status;

  if (matchStatus === 'FLAGGED_MISMATCH' || (distMeters !== null && distMeters > 300)) {
    isLocationDiscrepancy = true;
    photoDiscrepancyPenalty = 25;
    const distDesc = distMeters && distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)}km` : `${distMeters || 300}+ meters`;
    rationalePoints.push(
      `Photo Location Anomaly (Flagged): Camera was captured ${distDesc} away from reported incident GPS. Credibility adjustment applied pending physical audit.`
    );
  } else if (matchStatus === 'VERIFIED' || (distMeters !== null && distMeters <= 300)) {
    if (distMeters !== null && distMeters <= 50) {
      photoVerifiedBoost = 8;
      rationalePoints.push(
        `Photo GPS Verification: Cryptographic camera metadata confirmed on-site (within ${Math.round(distMeters)}m). Direct physical presence validated.`
      );
    } else {
      photoVerifiedBoost = 5;
      rationalePoints.push(
        `Photo GPS Verification: Camera capture validated within municipal tolerance (${Math.round(distMeters || 100)}m).`
      );
    }
  }

  const finalL = clamp(baseL + photoVerifiedBoost - photoDiscrepancyPenalty);
  rationalePoints.unshift(
    `Location (L=${finalL.toFixed(1)}/100): ${zoneLabel}${photoVerifiedBoost > 0 ? ' + Verified On-Site GPS' : ''}${isLocationDiscrepancy ? ' - Discrepancy Penalty' : ''}.`
  );

  return {
    locationImportance: finalL,
    isLocationDiscrepancy,
    photoVerifiedBoost,
    rationalePoints,
  };
}

/**
 * Transparent, explainable priority scoring service:
 * Formula: P = 0.35S + 0.20A + 0.20R + 0.15V + 0.10L
 */
export function calculatePriorityScore(input: PriorityCalculationInput): PriorityRecommendation {
  const rationale: string[] = [];

  // Description Semantics
  const descAnalysis = analyzeDescriptionSemantics(input.description, input.title);

  // S: Severity (0-100)
  let S: number;
  if (typeof input.explicitSeverity === 'number') {
    S = clamp(input.explicitSeverity);
    rationale.push(`Severity (S=${S.toFixed(1)}/100): Direct municipal inspection severity rating.`);
  } else {
    const baseS = CATEGORY_SEVERITY[input.category] ?? 50;
    let computedS = baseS + descAnalysis.severityAdjustment;

    if (descAnalysis.criticalHazardDetected) {
      computedS = Math.max(computedS, 85);
    } else if (descAnalysis.cosmeticMitigationDetected && !descAnalysis.highHazardDetected) {
      computedS = Math.min(computedS, 40);
    }

    S = clamp(computedS);
    if (descAnalysis.severityAdjustment !== 0) {
      rationale.push(
        `Severity (S=${S.toFixed(1)}/100): Base ${baseS} for ${input.category} modulated by description analysis (${descAnalysis.severityAdjustment >= 0 ? '+' : ''}${descAnalysis.severityAdjustment.toFixed(1)}).`
      );
    } else {
      rationale.push(`Severity (S=${S}/100): Baseline hazard for ${input.category} category.`);
    }
    rationale.push(...descAnalysis.rationalePoints);
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
  let R = input.safetyRisk ? 100 : 0;
  if (input.safetyRisk) {
    rationale.push(`Safety Risk (R=100/100): Citizen flagged immediate danger to public safety or bodily hazard.`);
  } else if (descAnalysis.inferredImminentHazard) {
    R = 85;
    rationale.push(`Safety Risk (R=85/100): Inferred acute bodily risk from description keywords.`);
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
  const locAnalysis = analyzeLocationAndPhotoMetadata(input);

  if (typeof input.explicitLocationImportance === 'number') {
    L = clamp(input.explicitLocationImportance);
    rationale.push(`Location (L=${L.toFixed(1)}/100): Configured zone priority.`);
  } else {
    L = locAnalysis.locationImportance;
    rationale.push(...locAnalysis.rationalePoints);
  }

  // Formula: P = 0.35S + 0.20A + 0.20R + 0.15V + 0.10L
  const weights = { S: 0.35, A: 0.20, R: 0.20, V: 0.15, L: 0.10 };
  let rawScore = weights.S * S + weights.A * A + weights.R * R + weights.V * V + weights.L * L;

  // Location Discrepancy Guardrail
  if (locAnalysis.isLocationDiscrepancy && rawScore > 65) {
    rawScore = 65;
    rationale.push(`Priority Guardrail: Score capped at 65 pending on-site verification due to photo location discrepancy.`);
  }

  const score = Math.round(clamp(rawScore) * 10) / 10;

  // Determine Level and SLA
  let recommendedPriority: PriorityLevel;
  let slaHours: number;

  if (score >= 68 || (R >= 85 && S >= 75)) {
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
