import {NextRequest, NextResponse} from "next/server"

const PROTECTED_ROUTES: Array<string> = ["/dashboard", "/users", "/roles", "/enquiry", "/teams", "/notes", "/calender", "support", "/leads", "/deals", "/quotations", "/invoice", "/telephone", "/prospects", "/task"]
export function proxy(request: NextRequest){
    const {pathname} = request.nextUrl

    const accessToken = request.cookies.get("accessToken")?.value
    const refreshToken = request.cookies.get("refreshToken")?.value

    console.log("accessToken: ", accessToken)
    console.log("refreshToken: ", refreshToken)

    if(PROTECTED_ROUTES.some((item)=> pathname.startsWith(item) && (!accessToken && !refreshToken))){

        
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
    matcher: ["/dashboard", "/dashboard/:path*", "/login", "/users", "/users/:path*", "/roles", "/roles/:path*", "/enquiry", "/enquiry:path*", "/teams", "/teams/:path*", "/notes", "/notes/:path*", "/calender", "/calender/:path*", "/support", "/support/:path*", "/leads", "/leads/:path*", "/deals", "/deals/:path*", "/quotations", "/quotations/:path*", "/invoice", "/invoice/:path*", "/telephone", "/telephone/:path*", "/prospects", "/prospects/:path*", "/task", "/task/:path*"]
}

