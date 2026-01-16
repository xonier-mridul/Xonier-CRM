import { User } from "../auth/auth.types";



export interface TeamCreatePayload {
    name: string;
    category: string;
    description?: string;
    members: string[];
}

export interface TeamUpdatePayload {
    name: string;
    category: string;
    description?: string;
    isActive: boolean,
    members: string[];
}


export interface TeamCategoryCreatePayload {
    name: string;
    description?: string;
}

export interface GetTeamCategoryParams {
    page: number,
    limit: number
}

export interface TeamCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface Team {
    id: string
    name: string
    slug: string
    category: TeamCategory | string
    description?: string
    members: User[]
    isActive: boolean
    isDefault: boolean
    createdBy: User
    createdAt: string
    updatedAt?: string
    updatedBy?: User | null
}


