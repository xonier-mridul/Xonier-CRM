"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { AuthService } from "@/src/services/auth.service";
import { login, setAuthState, logout } from "@/src/store/slices/authSlice";

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
      } catch {
        dispatch(logout());
      }
    };

    initAuth();
  }, [dispatch]);

  return <>{children}</>;
}
