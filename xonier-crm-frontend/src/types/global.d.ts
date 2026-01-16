import { ChangeEvent, FormEvent, ReactNode } from "react"


declare global {
  namespace Express {
    
  }

  interface ConfirmPopupInterface {
    title: string,
    text: string,
    btnTxt?: string
  }

  interface PrimaryButtonProps {
    text: string,
    isLoading?: boolean,
    disabled?: boolean,
    link: string,
    icon?:  ReactNode
  }

  
}

export {}