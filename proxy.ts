import { NextResponse, type NextRequest } from "next/server"

import { canOpen, homeFor } from "@/lib/auth/roles"
import { getSessionUser } from "@/lib/auth/session"

// Pages only signed-out users should see; signed-in users are sent to their home page
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
  const user = await getSessionUser({ request, response })

  const { pathname } = request.nextUrl
  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, request.url))

  if (pathname.startsWith("/api/")) {
    return user
      ? response
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (pathname === "/") {
    return redirectTo(user ? homeFor(user.role) : "/sign-in")
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) return redirectTo("/sign-in")
    // Pages not listed in PAGE_ROLES are closed to everyone
    return canOpen(user.role, pathname)
      ? response
      : redirectTo(homeFor(user.role))
  }

  if (AUTH_PAGES.includes(pathname) && user) {
    return redirectTo(homeFor(user.role))
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
