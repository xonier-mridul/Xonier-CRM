"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AuthService } from "@/src/services/auth.service";
import { setAuthState, logout, setIsAdmin } from "@/src/store/slices/authSlice";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { UserRole } from "@/src/types";
import { AxiosError } from "axios";

export default function CheckAuth({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        
        const res = await AuthService.me();

        dispatch(setAuthState(res.data.data));
        const userRole: Array<UserRole> = res.data.data.userRole;
        if (userRole.some((i) => i.code === SUPER_ADMIN_ROLE_CODE)) {
          dispatch(setIsAdmin());
        }
      } catch (error) {
        const pathname = window.location.pathname;
        if (error instanceof AxiosError) {
          // if (error.response?.status === 401 && (pathname !== "/login")) {
          //   try {
              
          //     const res = await AuthService.refreshAccessToken();
              
             
          //     dispatch(setAuthState(res.data.data));
          //     const userRole: Array<UserRole> = res.data.data.userRole;
          //     if (userRole.some((i) => i.code === SUPER_ADMIN_ROLE_CODE)) {
          //       dispatch(setIsAdmin());
          //     }
          //   } catch (err) {
               
          //     dispatch(logout());
          //   }
          // }
        }
        else{

        // dispatch(logout());
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [dispatch]);

  if (isLoading) return null;

  return <>{children}</>;
}
