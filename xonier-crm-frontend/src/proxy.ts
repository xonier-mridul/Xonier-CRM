import {NextRequest, NextResponse} from "next/server"

const PROTECTED_ROUTES: Array<string> = ["/dashboard", "/users", "/roles", "/enquiry", "/teams", "/notes", "/calender", "support", "/leads", "/deals", "/quotations", "/invoice", "/telephone", "/prospects", "/task", "/companies", "/plans","/subscriptions"]
export function proxy(request: NextRequest){
    const {pathname} = request.nextUrl

    const accessToken = request.cookies.get("accessToken")?.value
    const refreshToken = request.cookies.get("refreshToken")?.value


    
   
    

    if(PROTECTED_ROUTES.some((item)=> pathname.startsWith(item) && !accessToken && !refreshToken)){
       
        const loginUrl = new URL("/login", request.url)

        return NextResponse.redirect(loginUrl)
    }

    // A cookie can belong to a revoked session. Only the API may establish
    // whether it is active; never bounce the login page on cookie presence.

    return NextResponse.next()
}

export const config = {
    matcher: ["/dashboard", "/dashboard/:path*", "/login", "/users", "/users/:path*", "/roles", "/roles/:path*", "/enquiry", "/enquiry:path*", "/teams", "/teams/:path*", "/notes", "/notes/:path*", "/calender", "/calender/:path*", "/support", "/support/:path*", "/leads", "/leads/:path*", "/deals", "/deals/:path*", "/quotations", "/quotations/:path*", "/invoice", "/invoice/:path*", "/telephone", "/telephone/:path*", "/prospects", "/prospects/:path*", "/task", "/task/:path*", "/companies", "/companies:path*", "/plans", "/plans/:path*", "/subscriptions", "/subscriptions/:path*"]
}

