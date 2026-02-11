import api from "../lib/axios";



const CustomFormService = {
    getAllByCreator : ()=> api.get(`custom-field/get_buy_creator`)
}


export default CustomFormService