import {NextRequest, NextResponse} from "next/server"

const PROTECTED_ROUTES: Array<string> = ["/dashboard", "/users", "/roles", "/enquiry", "/teams", "/notes", "/calender", "support", "/leads", "/deals", "/quotations"]
export function proxy(request: NextRequest){
    const {pathname} = request.nextUrl

    const accessToken = request.cookies.get("accessToken")?.value

    if(PROTECTED_ROUTES.some((item)=> pathname.startsWith(item) && !accessToken)){
        const loginUrl = new URL("/login", request.url)

        return NextResponse.redirect(loginUrl)
    }

    if(pathname.startsWith("/login") && accessToken){
        const dashboardUrl = new URL("/dashboard", request.url)
        return NextResponse.redirect(dashboardUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard", "/dashboard/:path*", "/login", "/users", "/users/:path*", "/roles", "/roles/:path*", "/enquiry", "/enquiry:path*", "/teams", "/teams/:path*", "/notes", "/notes/:path*", "/calender", "/calender/:path*", "/support", "/support/:path*", "/leads", "/leads/:path*", "/deals", "/deals/:path*", "/quotations", "/quotations/:path*"]
}



// import { NextRequest, NextResponse } from "next/server";

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
