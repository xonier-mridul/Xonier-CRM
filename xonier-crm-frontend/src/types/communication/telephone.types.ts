import { PHONE_NUMBER_STATUS } from "@/src/constants/enum";
import { User } from "../auth/auth.types";

export interface TelephoneNumber {
  id: string;
  phoneNumber: string;
  status: PHONE_NUMBER_STATUS;
  createdBy: string | User; 
  createdAt: string;
  deletedAt?: string | null;
  deletedBy?: string | User | null;
}



export interface CreatePhoneNumber {
    phoneNumber: string
}