"use client";

import { Provider } from "react-redux";
import { store } from "./index";
import CheckAuth from "../components/common/CheckAuth";
import { usePathname } from "next/navigation";

export default function ReduxProvider({ children }: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const publicPaths = [

    "/login",          // Standard login page
    "/admin-login",    // Alternative admin login page (if applicable)
    "/forgot-password", // Forgot password page
    "/forgot-companyId",
    "/change-password"

  ];


  const isPublicRoute = publicPaths.some(
    (path) => pathname === path || pathname?.startsWith(path + "/")
  );

  return (
    <Provider store={store}>
      {isPublicRoute ? (
        // Bypass authentication check for login/public pages
        <>{children}</>
      ) : (
        // Protect all other routes with CheckAuth
        <CheckAuth>{children}</CheckAuth>
      )}
    </Provider>
  );
}