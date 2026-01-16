import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { UserRole } from "@/src/types";


const checkRole = (permission: string, userRole: UserRole[])=>{
    if(userRole.some(i => i.code === SUPER_ADMIN_ROLE_CODE)){
        return true
    }
    
    return userRole.some(i=>i.code === permission)

}

export default checkRole