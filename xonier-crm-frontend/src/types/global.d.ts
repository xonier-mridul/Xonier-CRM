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

  interface SecondaryButtonProps {
    text: string,
    isLoading?: boolean,
    disabled?: boolean,
    onClickEvt: ()=>void,
    icon?:  ReactNode
  }

  
}

export {}