import {createSlice, PayloadAction} from "@reduxjs/toolkit"
import {AuthState} from "@/src/types/auth/auth.types"


const initialState: AuthState = {
    isAuthenticated: false,
    isAdmin: false,
    user: null
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
       login: (state, action: PayloadAction<any>) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        // Persist to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_user", JSON.stringify(action.payload));
        }
       },
       setAuthState: (state, action: PayloadAction<any>) => {
        state.isAuthenticated = true;
        state.user = action.payload;
       },
       setIsAdmin: (state) => {
         state.isAdmin = true;
       },
       logout: (state) => {
        state.isAuthenticated = false;
        state.user = null;
        // Clear persisted state
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_user");
        }
       }
    }
})
export const {login, logout, setAuthState, setIsAdmin} = authSlice.actions

export default authSlice.reducer

