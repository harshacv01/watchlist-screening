import { cookies } from "next/headers"

import { AppSidebar } from "@/components/core/app-sidebar"
import { SessionProvider } from "@/components/providers/session-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getSessionUser } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read on the server so the menu renders with the right items straight away
  const user = await getSessionUser({ cookies })

  return (
    <SessionProvider user={user}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  )
}
