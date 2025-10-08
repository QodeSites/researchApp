"use client";

import { Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/contexts/PermissionsContext";

export default function ClientLayout({ children }) {
  const { allowedItems, loading, error } = usePermissions();
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <AppSidebar allowedItems={allowedItems} />
      <main className="w-full h-full bg-secondary p-1 md:p-4">
        <SidebarTrigger />
          {loading ? (
            <div className="min-h-screen">Loading...</div>
          ) : error ? (
            null
          ) : (
            (() => {
              const allowedUrls = allowedItems.map((i) => i.url);
              const hasPermission = allowedUrls.includes(pathname);
              return hasPermission ? (
                children
              ) : (
                <div className="min-h-screen flex justify-center items-center p-6 text-red-600">
                  🚫 Permission Denied
                </div>
              );
            })()
          )}
      </main>
    </SidebarProvider>
  );
}