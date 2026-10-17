declare module "react-phone-number-input" {
  import type { ComponentType, InputHTMLAttributes } from "react";

  interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
    value?: string;
    onChange: (value: string | undefined) => void;
    international?: boolean;
    defaultCountry?: string;
  }

  const PhoneInput: ComponentType<PhoneInputProps>;
  export default PhoneInput;
}
