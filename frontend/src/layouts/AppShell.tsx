import * as React from "react"
import { Sidebar } from "./Sidebar"
import { Search, Bell, User, Calendar } from "lucide-react"

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const currentDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Global Merchant Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-6 bg-[var(--color-paper)] z-10">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-black uppercase tracking-widest">{title}</h1>
            <div className="h-4 w-px bg-[var(--color-border-subtle)]"></div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight">Demo Merchant</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink)]/60">MID 100001</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:flex items-center text-[var(--color-ink)]/60 hover:text-[var(--color-ink)] focus-within:text-[var(--color-ink)] transition-colors">
              <Search className="absolute left-2 h-4 w-4" />
              <input 
                type="text" 
                placeholder="Search payments, customers..." 
                className="h-8 w-64 rounded-none border border-[var(--color-border-subtle)] bg-transparent pl-8 pr-3 text-xs placeholder:text-[var(--color-ink)]/40 focus:border-[var(--color-ink)] focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border-subtle)] text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 opacity-70" />
              <span>{currentDate}</span>
            </div>
            <button className="flex h-8 w-8 items-center justify-center border border-transparent hover:border-[var(--color-border-subtle)] transition-colors relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-failure)]"></span>
            </button>
            <button className="flex h-8 w-8 items-center justify-center border border-transparent hover:border-[var(--color-border-subtle)] transition-colors">
              <User className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-auto bg-[var(--color-paper)]">
          {children}
        </main>
      </div>
    </div>
  )
}
