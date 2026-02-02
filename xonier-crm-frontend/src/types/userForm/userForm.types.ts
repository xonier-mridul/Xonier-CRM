
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

export interface CustomField {
  id: string;              
  name: string;              
  key: string;               

  type: CustomFieldType;

  required?: boolean;
  isActive?: boolean;

  options?: SelectOption[];  
  placeholder?: string;
  order?: number;

  createdAt?: string;        
  updatedAt?: string;        
}



export interface UserForm {
    id: string
    userId: string 
    selectedFormFields: Array<CustomField>
    status: boolean
    createdAt: string
    updatedAt?: string
}

export interface CreateUserForm {
    
    selectedFormFields: string[]
}

export interface UpdateUserForm {
    module:string
    selectedFormFields: string[]
}