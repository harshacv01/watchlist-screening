"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"
import { Button } from "../ui/button"
import { signOut } from "aws-amplify/auth"
import { Spinner } from "../ui/spinner"
import { useSessionUser } from "@/components/providers/session-provider"
import { canOpen } from "@/lib/auth/roles"

// Each item is shown only to the roles allowed to open its page (PAGE_ROLES in lib/auth/roles.ts)
const data = {
  navMain: [
    {
      title: "Watchlist Screening Task Tracker",
      url: "#",
      items: [
        {
          title: "Watchlist Upload",
          url: "/dashboard",
        },
        {
          title: "Batch Screening",
          url: "/dashboard/batch-screening",
        },
        {
          title: "Screen Name",
          url: "/dashboard/screen-name",
        },
        {
          title: "Evaluate Screening Results",
          url: "/dashboard/evaluate-screen",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useSessionUser()

  const [loading, setLoading] = React.useState(false)

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await signOut()
      router.replace("/sign-in")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items
                  .filter((subItem) => canOpen(user?.role, subItem.url))
                  .map((subItem) => {
                    const isActive =
                      pathname === subItem.url ||
                      (subItem.url !== "/" &&
                        subItem.url !== "/dashboard" &&
                        pathname.startsWith(`${subItem.url}/`))

                    return (
                      <SidebarMenuItem key={subItem.title}>
                        <SidebarMenuButton
                          render={<Link href={subItem.url} />}
                          isActive={isActive}
                        >
                          {subItem.title}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <div className="flex flex-col gap-1 px-2 pb-1 text-sm">
            <span className="truncate font-medium">{user.email}</span>
            <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
              {user.role}
            </span>
          </div>
        ) : null}
        <Button onClick={handleSignOut}>
          Sign Out
          {loading && <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
