import { toast } from "react-toastify"

export const handleCopy = (text: string ):void=>{
    if(!text){
        return
    }
    navigator.clipboard.writeText(text)
    toast.success(`${text} copied successfully`)
  }