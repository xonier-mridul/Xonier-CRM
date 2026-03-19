import { User } from "@/src/types/auth/auth.types";
export interface Prospect {
  id: string;
  enquiry_id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  infoType: "people" | "company";
  designation: string;
  assignedAt: string | null;

  socialLinks: {
    linkedin?: string | null;
    twitter?: string | null;
    github?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    website?: string | null;
    other?: string | null;
  };

  location: {
    country: string;
    state: string;
    city: string;
    zipcode: string;
  };

  numberOfEmployees: string;
  industry: string[];
  technologies: string[];
  keywords: string[];

  priority: string;
  projectType: string;
  status: string;
  isActive: boolean;
  source: string;
  message?: string | null;
  assignTo?: User | null;
  dataTag?: string | null;

  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    hashedEmail: string;
    phone: string;
    isEmailVerified: boolean;
    status: string;
    company: string;
    isActive: boolean;
    lastLogin: string;
    createdAt: string;
    updatedAt: string;
    assignedAt?: string | null;
  };

  updatedBy?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ActiveColumns {
  [key: string]: Boolean;
}

export interface DefaultActive {
  [key: string]: ActiveColumns;
}
