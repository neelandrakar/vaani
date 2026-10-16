const API_BASE = '/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
  businessId: string;
  businessName?: string;
}

export interface Lead {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  preferredLanguage: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'LOST';
  notes?: string | null;
  contactConsent: boolean;
  doNotCall: boolean;
  requirements?: {
    id: string;
    propertyType?: string | null;
    transactionType: 'BUY' | 'RENT' | 'BOTH';
    location?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    timeline?: string | null;
    bedrooms?: number | null;
    isQualified: boolean;
    rawNotes?: string | null;
  } | null;
  callbacks?: any[];
  conversations?: any[];
  _count?: { conversations: number };
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  leadId?: string | null;
  lead?: { id: string; name: string; phone: string; status: string; requirements?: any };
  channel: string;
  status: string;
  language: string;
  providerId: string;
  summary?: string | null;
  outcome?: string | null;
  durationSec?: number | null;
  messages?: Array<{
    id: string;
    role: 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';
    content: string;
    latencyMs?: number | null;
    createdAt: string;
  }>;
  toolExecutions?: Array<{
    id: string;
    toolName: string;
    inputParams: any;
    outputResult: any;
    status: string;
    executionTimeMs: number;
    createdAt: string;
  }>;
  latencyMetrics?: any;
  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  _count?: { messages: number; toolExecutions: number };
}

export interface Callback {
  id: string;
  businessId: string;
  leadId: string;
  lead: { id: string; name: string; phone: string; preferredLanguage: string; requirements?: any };
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string; email: string } | null;
  requestedTime: string;
  timezone: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('vaani_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('vaani_token', token);
    } else {
      localStorage.removeItem('vaani_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      this.setToken(null);
      window.location.reload();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Request failed');
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  // Leads
  async listLeads(params?: { search?: string; status?: string }): Promise<{ total: number; leads: Lead[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    return this.request<{ total: number; leads: Lead[] }>(`/leads?${query.toString()}`);
  }

  async getLead(id: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}`);
  }

  async createLead(leadData: any): Promise<Lead> {
    return this.request<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(id: string, updates: any): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Conversations
  async listConversations(params?: { leadId?: string }): Promise<{ total: number; conversations: Conversation[] }> {
    const query = new URLSearchParams();
    if (params?.leadId) query.append('leadId', params.leadId);
    return this.request<{ total: number; conversations: Conversation[] }>(`/conversations?${query.toString()}`);
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async startTextConversation(leadId?: string, language: string = 'en') {
    return this.request<{ conversationId: string; greeting: string; language: string }>('/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ leadId, language, channel: 'BROWSER_TEXT' }),
    });
  }

  async sendTextTurn(conversationId: string, message: string, language: string = 'en') {
    return this.request<{ response: string; toolResults: any[]; metrics: any }>('/conversations/text-turn', {
      method: 'POST',
      body: JSON.stringify({ conversationId, message, language }),
    });
  }

  // Callbacks
  async listCallbacks(status?: string): Promise<Callback[]> {
    const query = status ? `?status=${status}` : '';
    return this.request<Callback[]>(`/callbacks${query}`);
  }

  async updateCallbackStatus(id: string, status: string, notes?: string): Promise<Callback> {
    return this.request<Callback>(`/callbacks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async assignCallback(id: string, operatorUserId: string): Promise<Callback> {
    return this.request<Callback>(`/callbacks/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ operatorUserId }),
    });
  }

  // Config & Readiness
  async getBusinessConfig(): Promise<any> {
    return this.request<any>('/config/business');
  }

  async updateAgentConfig(data: any): Promise<any> {
    return this.request<any>('/config/agent', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getReadiness(): Promise<any> {
    return this.request<any>('/config/readiness');
  }

  // Properties & Knowledge
  async listProperties(): Promise<any[]> {
    return this.request<any[]>('/properties');
  }

  async listKnowledge(): Promise<any[]> {
    return this.request<any[]>('/knowledge');
  }

  async previewVoice(
    text?: string,
    language: string = 'en',
    voice: string = 'female',
    pitch?: string,
    rate?: string
  ): Promise<{ audioBase64: string; format: string; sampleRate: number }> {
    return this.request<{ audioBase64: string; format: string; sampleRate: number }>('/config/preview-voice', {
      method: 'POST',
      body: JSON.stringify({ text, language, voice, pitch, rate }),
    });
  }
}

export const api = new ApiService();
