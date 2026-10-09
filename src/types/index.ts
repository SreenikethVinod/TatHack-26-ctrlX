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
