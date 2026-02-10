import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { UserRole } from "@/src/types";


const checkRole = (permission: string, userRole: UserRole[]):boolean=>{
    if(userRole.some(i => i.code === SUPER_ADMIN_ROLE_CODE)){
        return true
    }
    
    for(let item of userRole){
        
        if(item.permissions?.some((i)=> i.code === permission)){
            
            return true
        }

    }
   
    return false

}

export default checkRole