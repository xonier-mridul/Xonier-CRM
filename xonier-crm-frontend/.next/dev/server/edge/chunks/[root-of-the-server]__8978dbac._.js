(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__8978dbac._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
const PROTECTED_ROUTES = [
    "/dashboard",
    "/users",
    "/roles",
    "/enquiry",
    "/teams",
    "/notes",
    "/calender",
    "support",
    "/leads",
    "/deals",
    "/quotations"
];
function middleware(request) {
    const { pathname } = request.nextUrl;
    const accessToken = request.cookies.get("accessToken")?.value;
    if (PROTECTED_ROUTES.some((item)=>pathname.startsWith(item) && !accessToken)) {
        const loginUrl = new URL("/login", request.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
    }
    if (pathname.startsWith("/login") && accessToken) {
        const dashboardUrl = new URL("/dashboard", request.url);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(dashboardUrl);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        "/dashboard",
        "/dashboard/:path*",
        "/login",
        "/users",
        "/users/:path*",
        "/roles",
        "/roles/:path*",
        "/enquiry",
        "/enquiry:path*",
        "/teams",
        "/teams/:path*",
        "/notes",
        "/notes/:path*",
        "/calender",
        "/calender/:path*",
        "/support",
        "/support/:path*",
        "/leads",
        "/leads/:path*",
        "/deals",
        "/deals/:path*",
        "/quotations",
        "/quotations/:path*"
    ]
} // import { NextRequest, NextResponse } from "next/server";
 // const PROTECTED_ROUTES = ["/dashboard", "/users", "/roles", "/enquiry", "/teams"];
 // const API_BASE_URL = process.env.API_BASE_URL!;
 // export async function middleware(request: NextRequest) {
 //   const { pathname } = request.nextUrl;
 //   let isAuthenticated = false;
 //   try {
 //     const res = await fetch(`${API_BASE_URL}/auth/me`, {
 //       headers: {
 //         cookie: request.headers.get("cookie") || "",
 //       },
 //     });
 //     if (res.status === 200) {
 //       isAuthenticated = true;
 //     }
 //   } catch (err) {
 //     isAuthenticated = false;
 //   }
 //   if (
 //     PROTECTED_ROUTES.some(
 //       (route) => pathname.startsWith(route) && !isAuthenticated
 //     )
 //   ) {
 //     return NextResponse.redirect(new URL("/login", request.url));
 //   }
 //   if (pathname.startsWith("/login") && isAuthenticated) {
 //     return NextResponse.redirect(new URL("/dashboard", request.url));
 //   }
 //   return NextResponse.next();
 // }
 // export const config = {
 //   matcher: [
 //     "/dashboard",
 //     "/dashboard/:path*",
 //     "/login",
 //     "/users",
 //     "/users/:path*",
 //     "/roles",
 //     "/roles/:path*",
 //     "/enquiry",
 //     "/enquiry/:path*",
 //     "/teams",
 //     "/teams/:path*",
 //   ],
 // };
;
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__8978dbac._.js.map