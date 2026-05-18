import { ReactNode } from "react"


declare global {
  namespace Express {
    
  }

  interface ConfirmPopupInterface {
    title: string,
    text: string,
    btnTxt?: string
    cancelTxt?: string
  }

  interface PrimaryButtonProps {
    text: string,
    isLoading?: boolean,
    isLoadingTxt?: string
    disabled?: boolean,
    link: string,
    icon?:  ReactNode
  }


  interface EventPrimaryButtonProps {
    text: string,
    isLoading?: boolean,
    isLoadingTxt?: string
    disabled?: boolean,
    event: ()=> void | Promise<void>,
    icon?:  ReactNode,
    variant?: "default" | "danger"
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
