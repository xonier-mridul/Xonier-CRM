import api from "../lib/axios";


export const QuoteHistoryService = {
    getHistoryByQuote: (id:string)=> api.get(`/quote-history/all/by-quote/${id}`)
}