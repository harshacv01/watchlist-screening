import { NextResponse, type NextRequest } from "next/server"
import { fetchAuthSession } from "aws-amplify/auth/server"

import { runWithAmplifyServerContext } from "@/lib/amplify-server"

// Pages only signed-out users should see; signed-in users are sent to the dashboard
const AUTH_PAGES = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/reset-password",
  "/confirm-reset-password",
]

export async function proxy(request: NextRequest) {
  // Passing the response lets Amplify write refreshed tokens back as cookies
  const response = NextResponse.next()

  const isSignedIn = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (ctx) => {
      try {
        const session = await fetchAuthSession(ctx)
        return session.tokens?.accessToken !== undefined
      } catch {
        return false
      }
    },
  })

  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) {
    return isSignedIn
      ? response
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (pathname === "/") {
    const target = isSignedIn ? "/dashboard" : "/sign-in"
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (pathname.startsWith("/dashboard")) {
    return isSignedIn
      ? response
      : NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (AUTH_PAGES.includes(pathname) && isSignedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/",
    "/sign-in",
    "/sign-up",
    "/verify-email",
    "/reset-password",
    "/confirm-reset-password",
    "/dashboard/:path*",
    "/api/:path*",
  ],
}
