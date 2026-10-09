export type ComplaintCategory =
  | 'road_damage'
  | 'waste_management'
  | 'drainage'
  | 'streetlights'
  | 'water_supply'
  | 'public_safety';

export type ComplaintStatus = 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Rejected';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'official' | 'admin';
  department?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AIVerificationResult {
  isAuthentic: boolean;             // True if real camera photo, false if AI-generated or spoofed
  authenticityScore: number;        // 0 to 100 percentage confidence of real physical capture
  isRelevant: boolean;              // True if image directly depicts reported municipal issue
  relevanceScore: number;           // 0 to 100 percentage relevance to category & description
  aiGeneratedProbability: number;   // 0 to 100 percentage likelihood of synthetic/diffusion generation
  detectedObjects: string[];        // Visual entities identified (e.g., ["asphalt pothole", "standing water"])
  visualSeverity: PriorityLevel;    // AI-assessed severity tier: 'Low' | 'Medium' | 'High' | 'Critical'
  severityScore: number;            // 0 to 100 calculated hazard & mobility score
  severityRationale: string[];      // Explanations for severity categorization
  corroboratingReportsCount: number;// Nearby matching complaints within proximity (< 600m)
  spatialClusterInfo?: string;      // Geographic context and cluster corroboration summary
  fraudFlag: boolean;               // Triggered if AI-generated, irrelevant, or duplicated
  fraudReason?: string;             // Detailed explanation if flagged
  verdict: 'VERIFIED_REAL' | 'SUSPICIOUS_AI' | 'IRRELEVANT' | 'NEEDS_INSPECTION';
  analyzedAt: string;               // ISO timestamp of verification
}

export interface Complaint {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  address: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl?: string;
  afterImageUrl?: string;
  status: ComplaintStatus;
  priority: PriorityLevel;
  systemRecommendedPriority: PriorityLevel;
  priorityRationale: string[];
  safetyRisk: boolean;
  assignedDepartment: string;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolutionSummary?: string | null;
  votesCount: number;
  slaHours: number;
  hasUserVoted?: boolean;
  aiVerification?: AIVerificationResult;
}

export interface ComplaintHistoryEntry {
  id: string;
  complaintId: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  publicUpdate: string;
  timestamp: string;
}

export interface OfficialNote {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  department: string;
  note: string;
  visibility: 'internal' | 'public';
  timestamp: string;
}

export interface AnalyticsSummary {
  total: number;
  resolved: number;
  inProgress: number;
  acknowledged: number;
  submitted: number;
  rejected: number;
  resolutionRate: number;
  avgResolutionHours: number;
  overdueCount: number;
}

export interface CategoryMetric {
  category: string;
  label: string;
  total: number;
  resolved: number;
  inProgress: number;
}

export interface AreaMetric {
  locality: string;
  count: number;
}

export interface DepartmentMetric {
  department: string;
  total: number;
  resolved: number;
  active: number;
  resolutionRate: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  categories: CategoryMetric[];
  topAreas: AreaMetric[];
  departmentPerformance: DepartmentMetric[];
}
