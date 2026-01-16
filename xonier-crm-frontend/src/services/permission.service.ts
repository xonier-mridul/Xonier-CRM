import api from "../lib/axios";



export const PermissionsService = {
    getAll: ()=> api.get("/permission/all")
}