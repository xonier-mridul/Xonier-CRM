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
        const { accessToken, refreshToken, access_token, refresh_token, password, ...profile } = action.payload;
        state.user = profile;
        state.isAdmin = profile.userRole?.some((role: { code: string }) => role.code === "SUPER_ADMIN") ?? false;
        // Persist to localStorage
        if (typeof window !== "undefined") {
          try { localStorage.setItem("auth_user", JSON.stringify(profile)); } catch { /* Storage may be disabled. */ }
        }
       },
       setAuthState: (state, action: PayloadAction<any>) => {
        state.isAuthenticated = true;
        const { accessToken, refreshToken, access_token, refresh_token, password, ...profile } = action.payload;
        state.user = profile;
        state.isAdmin = profile.userRole?.some((role: { code: string }) => role.code === "SUPER_ADMIN") ?? false;
       },
       setIsAdmin: (state) => {
         state.isAdmin = true;
       },
       logout: (state) => {
        state.isAuthenticated = false;
        state.isAdmin = false;
        state.user = null;
        // Clear persisted state
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("auth_user");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          } catch { /* Storage may be disabled. */ }
        }
       }
    }
})
export const {login, logout, setAuthState, setIsAdmin} = authSlice.actions

export default authSlice.reducer

