import {NextRequest, NextResponse} from "next/server"

const PROTECTED_ROUTES: Array<string> = ["/dashboard", "/users", "/roles", "/enquiry", "/teams"]
const API_BASE_URL = process.env.API_BASE_URL!;
export async function middleware(request: NextRequest){
    const {pathname} = request.nextUrl;

    const accessToken = request.cookies.get("accessToken")?.value;

    let isAuthenticated: boolean = false;


    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method:"GET",
        headers: {
        cookie: request.headers.get("cookie") || "",
      }
    })

    if(res.status === 200){
      const json = await res.json()
      isAuthenticated = true
      console.log("chuk dum dum")
    }
    } catch (error) {
        isAuthenticated = false
        console.log("naiyo re")
    }

    if(PROTECTED_ROUTES.some((item)=> pathname.startsWith(item) && !isAuthenticated)){
        const loginUrl = new URL("/login", request.url);

        return NextResponse.redirect(loginUrl);
    }

    if(pathname.startsWith("/login") && isAuthenticated){
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard", "/dashboard/:path*", "/login", "/users", "/users/:path*", "/roles", "/roles/:path*", "/enquiry", "/enquiry:path*", "/teams", "/teams/:path*"]
}

