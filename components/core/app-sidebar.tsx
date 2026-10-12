"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

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
      <SidebarRail />
    </Sidebar>
  )
}
