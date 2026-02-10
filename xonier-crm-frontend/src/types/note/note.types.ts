import { NotesEntities, NoteStatus, NoteVisibility } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface Note {
  id: string;

  title: string;
  content: string;

  entityType: NotesEntities;
  entityId?: string | null;

  visibility: NoteVisibility;
  status: NoteStatus;

  isPinned: boolean;
  byAdmin: boolean;

  createdBy: User;
  updatedBy?: User | null;

  createdAt: string;   
  updatedAt: string;
  deletedAt?: string | null;
}


export interface NoteCreatePayload {
  title: string;          
  content: string;

  entityType: NotesEntities;
  entityId?: string | null;

  visibility?: NoteVisibility; 
  isPinned?: boolean;       
}
