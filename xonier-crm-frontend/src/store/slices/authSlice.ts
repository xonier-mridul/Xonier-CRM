import {createSlice, PayloadAction} from "@reduxjs/toolkit"
import {AuthState} from "@/src/types/auth/auth.types"


const initialState: AuthState = {
    isAuthenticated: false,
    user: null
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
       login : (state, action: PayloadAction<any>)=>{
        state.isAuthenticated = true,
        state.user = action.payload
       },
       setAuthState: (state, action: PayloadAction<any>)=>{
        state.isAuthenticated = true,
        state.user = action.payload
       },
       logout : (state)=>{
        state.isAuthenticated = false,
        state.user = null
       }
    }
})

export const {login, logout, setAuthState} = authSlice.actions

export default authSlice.reducer

