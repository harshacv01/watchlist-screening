import { redirect } from "next/navigation"

// proxy.ts normally redirects "/" first (to /dashboard when signed in); this is the fallback
export default function HomePage() {
  redirect("/sign-in")
}
