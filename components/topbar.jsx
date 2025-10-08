"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-background border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-lg font-bold">Qode Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/80">
          Log out
        </button>
      </div>
    </header>
  )
}
