export enum FORM_FIELD_MODULES {
  LEAD = "lead",
  DEAL = "deal",
}

export interface SelectOption {
  label: string;
  value: string;
}

export type CustomFieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "select"
  | "textarea"
  | "date"
  | "checkbox";

export interface UserCustomField {
  id: string;               
  userId: string;             
  createdBy: string;          

  isCustomFiled: boolean;
  name: string;               
  key: string;                

  type: CustomFieldType;
  required: boolean;
  isActive: boolean;
  module: FORM_FIELD_MODULES;

  options?: SelectOption[];   
  placeholder?: string;
  order?: number;

  createdAt: string;          
  updatedAt: string;          
}


export interface CreateUserCustomField {
    name: string; 
    type: CustomFieldType;

    options: Array<SelectOption>;

    placeholder: string;

    order: 0;
}
