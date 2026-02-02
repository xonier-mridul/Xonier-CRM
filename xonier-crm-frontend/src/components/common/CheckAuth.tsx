"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { AuthService } from "@/src/services/auth.service";
import { login, setAuthState, logout, setIsAdmin } from "@/src/store/slices/authSlice";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { UserRole } from "@/src/types";

export default function CheckAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await AuthService.me();
        dispatch(setAuthState(res.data.data));
        const userRole:Array<UserRole> = res.data.data.userRole
        if(userRole.some((i)=>i.code === SUPER_ADMIN_ROLE_CODE)){

          dispatch(setIsAdmin())
        }
      } catch {
        dispatch(logout());
      }
    };

    initAuth();
  }, [dispatch]);

  return <>{children}</>;
}
