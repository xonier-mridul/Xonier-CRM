
import { Dispatch, SetStateAction } from "react";

export interface QueryData{
    id: string ;
    name:string;
    address: string;
    companyName: string;
    email: string;
    industryType: string;
    message?: string;
    phone: string;
    teamSize: string;
    createdAt:string;


}

export interface QueryTableProps {
        queryData:QueryData[];
        totalPage:number;
        handleChange:(val: string) => void;
        onBulkDelete:() => void ;
        onDelete:(val: string) => void;
        currentPage:number;
        pageLimit:number;
        setPageLimit:(val: number) => void;

        setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
        isLoading:boolean
        onSelect:(val: string) => void
        selected:string[]
}


