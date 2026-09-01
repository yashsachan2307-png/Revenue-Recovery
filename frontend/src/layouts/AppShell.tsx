import * as React from "react"
import { Sidebar } from "./Sidebar"

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center border-b border-[var(--color-border-subtle)] px-8">
          <h1 className="text-xl font-black uppercase tracking-widest">{title}</h1>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
