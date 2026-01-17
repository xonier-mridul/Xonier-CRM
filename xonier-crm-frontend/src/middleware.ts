import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/users", "/roles", "/enquiry", "/teams"];
const API_BASE_URL = process.env.API_BASE_URL!;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let isAuthenticated = false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (res.status === 200) {
      isAuthenticated = true;
    }
  } catch (err) {
    isAuthenticated = false;
  }

  if (
    PROTECTED_ROUTES.some(
      (route) => pathname.startsWith(route) && !isAuthenticated
    )
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/login") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/login",
    "/users",
    "/users/:path*",
    "/roles",
    "/roles/:path*",
    "/enquiry",
    "/enquiry/:path*",
    "/teams",
    "/teams/:path*",
  ],
};
