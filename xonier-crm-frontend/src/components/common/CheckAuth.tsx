"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AuthService } from "@/src/services/auth.service";
import { setAuthState, logout, setIsAdmin } from "@/src/store/slices/authSlice";
import { SUPER_ADMIN_ROLE_CODE } from "@/src/constants/constants";
import { UserRole } from "@/src/types";

export default function CheckAuth({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await AuthService.me();
        console.log("✅ me() success:", res.data.data); // ADD THIS
        dispatch(setAuthState(res.data.data));
        const userRole: Array<UserRole> = res.data.data.userRole;
        if (userRole.some((i) => i.code === SUPER_ADMIN_ROLE_CODE)) {
          dispatch(setIsAdmin());
        }
      } catch(error) {
        console.log("❌ me() failed:", error); // ADD THIS
        dispatch(logout());
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [dispatch]);

  // ✅ Block render until we know who the user is
  if (isLoading) return null;

  return <>{children}</>;
}