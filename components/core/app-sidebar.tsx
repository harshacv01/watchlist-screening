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
                {item.items.map((subItem) => {
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
        <Button onClick={handleSignOut}>
          Sign Out
          {loading && <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
