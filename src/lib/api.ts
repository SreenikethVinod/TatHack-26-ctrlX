import {
  AnalyticsData,
  Complaint,
  ComplaintCategory,
  ComplaintHistoryEntry,
  OfficialNote,
  PriorityLevel,
  User,
} from '../types';

let currentUserId = localStorage.getItem('civicpulse_user_id') || 'user-citizen-1';
let currentToken = localStorage.getItem('civicpulse_token') || '';

export function setApiUserId(userId: string) {
  currentUserId = userId;
  localStorage.setItem('civicpulse_user_id', userId);
}

export function setApiToken(token: string) {
  currentToken = token;
  localStorage.setItem('civicpulse_token', token);
}

export function getApiToken(): string {
  return currentToken;
}

export function getApiUserId(): string {
  return currentUserId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-demo-user-id': currentUserId,
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  async login(payload: { email: string; password: string }): Promise<{
    success: boolean;
    token: string;
    user: User;
  }> {
    const res = await request<{
      success: boolean;
      token: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.user?.id) {
      setApiUserId(res.user.id);
      setApiToken(res.token);
    }
    return res;
  },

  logout() {
    currentToken = '';
    localStorage.removeItem('civicpulse_token');
  },

  async getHealth(): Promise<{ status: string }> {
    return request('/health');
  },

  async getUsers(): Promise<{ users: User[] }> {
    return request('/auth/users');
  },

  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  async getComplaints(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    department?: string;
    locality?: string;
    search?: string;
    reporterId?: string;
  }): Promise<{ complaints: Complaint[]; count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val && val !== 'all') params.append(key, val);
      });
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/complaints${queryString}`);
  },

  async getComplaint(id: string): Promise<{
    complaint: Complaint;
    history: ComplaintHistoryEntry[];
    notes: OfficialNote[];
  }> {
    return request(`/complaints/${id}`);
  },

  async trackComplaint(reference: string): Promise<{
    complaint: Complaint;
    history: ComplaintHistoryEntry[];
    notes: OfficialNote[];
  }> {
    return request(`/complaints/track/${encodeURIComponent(reference.trim())}`);
  },

  async createComplaint(payload: {
    title: string;
    description: string;
    category: ComplaintCategory;
    address: string;
    locality?: string;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string;
    safetyRisk: boolean;
    photoFingerprint?: string | null;
    photoMetadata?: any | null;
    photoDistanceMeters?: number | null;
    isFlaggedLocationMismatch?: boolean;
    locationMatchStatus?: string;
  }): Promise<{
    success: boolean;
    complaint: Complaint;
    message: string;
    autoMerged?: boolean;
    canonicalReference?: string | null;
  }> {
    return request('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(
    id: string,
    payload: {
      status: string;
      reason?: string;
      publicUpdate?: string;
      resolutionSummary?: string;
      afterImageUrl?: string;
    }
  ): Promise<{ success: boolean; complaint: Complaint; historyEntry: ComplaintHistoryEntry; message: string }> {
    return request(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updatePriority(
    id: string,
    payload: {
      priority: PriorityLevel;
      overrideReason: string;
    }
  ): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateAssignment(
    id: string,
    payload: {
      department: string;
      note?: string;
    }
  ): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async voteComplaint(id: string): Promise<{ success: boolean; votesCount: number; hasUserVoted?: boolean; message: string }> {
    return request(`/complaints/${id}/votes`, {
      method: 'POST',
    });
  },

  async followComplaint(id: string): Promise<{ success: boolean; isFollowing: boolean; followersCount: number; message: string }> {
    return request(`/complaints/${id}/follow`, {
      method: 'POST',
    });
  },

  async getFollowStatus(id: string): Promise<{ isFollowing: boolean; followersCount: number }> {
    return request(`/complaints/${id}/follow-status`);
  },

  async getNotifications(): Promise<{ success: boolean; notifications: any[]; unreadCount: number }> {
    return request('/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request('/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  async addNote(
    id: string,
    payload: {
      note: string;
      visibility: 'internal' | 'public';
    }
  ): Promise<{ success: boolean; note: OfficialNote }> {
    return request(`/complaints/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAnalytics(): Promise<AnalyticsData> {
    return request('/analytics');
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    department?: string;
    locality?: string;
  }): Promise<{ success: boolean; user: User; token: string }> {
    const res = await request<{ success: boolean; user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.user?.id) {
      setApiUserId(res.user.id);
      setApiToken(res.token);
    }
    return res;
  },

  async acknowledgeComplaint(id: string, notes?: string): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async assignWorkerAndBudget(
    id: string,
    worker: string,
    budget: number,
    budgetNotes?: string
  ): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ worker, budget, budgetNotes }),
    });
  },

  async getDistrictEscalations(): Promise<{ success: boolean; escalations: Complaint[]; count: number; policyNote: string }> {
    return request('/district/escalations');
  },

  async districtIntervene(
    id: string,
    payload: {
      actionType: 'DIRECT_ASSIGN' | 'FORMAL_DIRECTIVE' | 'FORCE_ACKNOWLEDGE' | 'EMERGENCY_FUNDS';
      directiveText: string;
      worker?: string;
      emergencyBudget?: number;
    }
  ): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/district-action`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async simulateOverdueReport(payload?: {
    title?: string;
    description?: string;
    category?: string;
    address?: string;
    daysAged?: number;
  }): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request('/complaints/simulate-overdue', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async ageComplaint(id: string, days: number = 15): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/age`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },

  async resetDemoData(): Promise<{ success: boolean; message: string; complaintsCount: number }> {
    return request('/reset-demo-data', {
      method: 'POST',
    });
  },

  async reverseGeocode(lat: number, lng: number): Promise<{
    success: boolean;
    address: string;
    locality: string;
    city: string;
    displayName: string;
    latitude: number;
    longitude: number;
    source: string;
  }> {
    return request(`/geocode/reverse?lat=${lat}&lng=${lng}`);
  },
};
