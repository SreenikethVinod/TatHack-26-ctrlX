export type ComplaintCategory =
  | 'road_damage'
  | 'waste_management'
  | 'drainage'
  | 'streetlights'
  | 'water_supply'
  | 'public_safety'
  | 'other';

export type ComplaintStatus =
  | 'Submitted'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Escalated to District Admin';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'official' | 'admin';
  systemRole?: string;
  department?: string;
  avatarUrl?: string;
  createdAt: string;
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
  assignedOfficerId?: string | null;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolutionSummary?: string | null;
  votesCount: number;
  slaHours: number;
  hasUserVoted?: boolean;
  ackDeadline?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  acknowledgedByName?: string | null;
  assignedWorker?: string | null;
  budget?: number;
  budgetNotes?: string | null;
  assignedAt?: string | null;
  assignedByName?: string | null;
  isEscalatedDistrict?: boolean;
  districtActionNotes?: string | null;
  districtActionAt?: string | null;
  districtActionBy?: string | null;
  daysUnacknowledged?: number;
  followersCount?: number;
  isFollowing?: boolean;
  mergedCount?: number;
  isMerged?: boolean;
  mergedWithReference?: string | null;
  photoFingerprint?: string | null;
  photoMetadata?: PhotoVerificationMetadata | null;
  isFlaggedLocationMismatch?: boolean;
  locationMatchStatus?: 'VERIFIED' | 'FLAGGED_MISMATCH' | 'NO_PHOTO';
  photoDistanceMeters?: number | null;
}

export interface PhotoVerificationMetadata {
  capturedAt: string;
  captureSource: 'in_app_camera';
  dimensions: { width: number; height: number };
  deviceGps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  reportedGps?: {
    latitude: number;
    longitude: number;
  } | null;
  distanceMeters?: number | null;
  fingerprint: string;
  isFlagged: boolean;
  status: 'VERIFIED' | 'FLAGGED_MISMATCH' | 'NO_PHOTO';
  notes?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  complaintId: string;
  complaintReference: string;
  complaintTitle: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ComplaintHistoryEntry {
  id: string;
  complaintId: string;
  previousStatus: string;
  newStatus: string;
  eventType?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  publicUpdate: string;
  explanation?: string;
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

export type WasteType =
  | 'bulk_furniture'
  | 'construction_debris'
  | 'electronic_waste'
  | 'garden_green'
  | 'hazardous_chemical'
  | 'recyclable_scrap'
  | 'general_bulk';

export type WastePickupStatus =
  | 'Requested'
  | 'Scheduled'
  | 'Dispatched'
  | 'Completed'
  | 'Cancelled';

export interface WastePickup {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string | null;
  wasteType: WasteType;
  estimatedWeight?: string | null;
  pickupDate: string;
  timeSlot: string;
  address: string;
  locality: string;
  pincode?: string | null;
  specialInstructions?: string | null;
  imageUrl?: string | null;
  status: WastePickupStatus;
  assignedCrew?: string | null;
  assignedVehicle?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface WasteStats {
  totalBookings: number;
  completed: number;
  dispatched: number;
  pending: number;
  ecoDivertedKg: number;
}

export interface AIVerificationResult {
  isAuthentic: boolean;
  authenticityScore: number;
  aiGeneratedProbability: number;
  visualSeverity: PriorityLevel;
  severityScore: number;
  severityRationale: string[];
  fraudFlag: boolean;
  fraudReason?: string;
  verdict: 'VERIFIED_REAL' | 'SUSPICIOUS_AI' | 'IRRELEVANT' | 'NEEDS_INSPECTION';
  analyzedAt: string;
}
