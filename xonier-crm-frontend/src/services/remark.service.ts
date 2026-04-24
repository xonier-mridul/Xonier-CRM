import api from "../lib/axios"

export interface RemarkMessagePayload {
    taskId:string;
    content: string,
}

export const RemarkService = {
    getByTask:(id:string)=>{
        return api.get(`/task/${id}/remarks`)
    },
    create :(data:RemarkMessagePayload)=>{
       return api.post(`/task/${data.taskId}/remark`,{content:data.content})
    },
    acknowledge :(id:string) =>  api.patch(`/task/${id}/remarks/acknowledge`,{acknowledge:true}),
    delete: (id: string)=> api.delete(`/task/remark/${id}/delete`)
   
}