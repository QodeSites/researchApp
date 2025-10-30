"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AppSidebar({ allowedItems }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <Sidebar>
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup>
          <SidebarGroupLabel>
            <h2 className="mt-2 font-semibold">Q360</h2>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-8">
            <SidebarMenu>
              {allowedItems.map((item) => {
                const isActive = pathname === item.url;
                const Icon = Icons[item.icon] || Icons.Circle;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={clsx(
                        "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                        isActive
                          ? "bg-primary text-white"
                          : "hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Link href={item.url}>
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="mt-auto space-y-4">
          {!isLoading && user && (
            <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            <LogOut className="h-5 w-5" />
            <span>Log Out</span>
          </Button>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}