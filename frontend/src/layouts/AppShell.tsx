import * as React from "react"
import { Sidebar } from "./Sidebar"
import { Search, Bell, User, Calendar, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Drawer } from "../components/ui/Drawer"

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const currentDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    }
  });

  const unreadCount = notifications?.filter((n: any) => n.is_read === 0).length || 0;

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
            <button 
              onClick={() => setShowNotifications(true)}
              className="flex h-8 w-8 items-center justify-center border border-transparent hover:border-[var(--color-border-subtle)] transition-colors relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-failure)]"></span>
              )}
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

      <Drawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
        width="400px"
      >
        <div className="flex flex-col gap-4">
          {(notifications || []).length === 0 ? (
            <div className="text-sm font-mono opacity-50 uppercase text-center mt-8">No notifications</div>
          ) : (
            (notifications || []).map((n: any) => (
              <div key={n.id} className={`flex flex-col gap-1 p-3 border ${n.is_read ? 'border-[var(--color-border-subtle)] opacity-70' : 'border-[var(--color-ink)] bg-[var(--color-ink)]/5'}`}>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs uppercase tracking-wider">{n.title}</span>
                  <span className="text-[10px] font-mono opacity-60">{new Date(n.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs mt-1">{n.message}</p>
                {n.case_id && (
                  <span className="text-[10px] font-mono font-bold mt-2 opacity-70">CASE: {n.case_id}</span>
                )}
              </div>
            ))
          )}
        </div>
      </Drawer>
    </div>
  )
}
