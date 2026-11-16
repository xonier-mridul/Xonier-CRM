import api from "../lib/axios";

export interface OrganizationRecord {
  id: string;
  name: string;
  cnpj?: string | null;
  industry?: string | null;
  size?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  peopleCount?: number;
  leadsCount?: number;
  dealsCount?: number;
  totalDealAmount?: number;
}

export interface OrganizationPayload {
  name: string;
  cnpj?: string | null;
  industry?: string | null;
  size?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface PersonRecord {
  id: string;
  fullName: string;
  organizationId?: string | null;
  organizationName?: string | null;
  organization?: {
    id: string;
    name: string;
    cnpj?: string | null;
    industry?: string | null;
  } | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  leadsCount?: number;
  dealsCount?: number;
}

export interface PersonPayload {
  fullName: string;
  organizationId?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
}

export const OrganizationService = {
  getAll: (page = 1, limit = 10, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    return api.get(`/organizations/all?${params.toString()}`);
  },
  getById: (id: string) => api.get(`/organizations/${id}`),
  create: (payload: OrganizationPayload) => api.post("/organizations/create", payload),
  update: (id: string, payload: Partial<OrganizationPayload>) =>
    api.put(`/organizations/update/${id}`, payload),
  delete: (id: string) => api.delete(`/organizations/delete/${id}`),
  sync: () => api.post("/organizations/sync"),
};

export const PersonService = {
  getAll: (page = 1, limit = 10, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    return api.get(`/people/all?${params.toString()}`);
  },
  getById: (id: string) => api.get(`/people/${id}`),
  create: (payload: PersonPayload) => api.post("/people/create", payload),
  update: (id: string, payload: Partial<PersonPayload>) =>
    api.put(`/people/update/${id}`, payload),
  delete: (id: string) => api.delete(`/people/delete/${id}`),
};
