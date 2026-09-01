import * as React from "react"
import { Moon, Sun, Terminal } from "lucide-react"
import { NavLink } from "react-router-dom"

export function Sidebar() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      setTheme("light")
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const links = [
    { name: "Overview", path: "/" },
    { name: "Payments", path: "/payments" },
    { name: "At Risk", path: "/at-risk" },
    { name: "Recoveries", path: "/recoveries" },
    { name: "Customers", path: "/customers" },
    { name: "Agent", path: "/agent" },
    { name: "Audit Log", path: "/audit-log" },
    { name: "Evaluation", path: "/evaluation" },
  ]

  return (
    <div className="flex h-screen w-64 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-paper)] p-4">
      <div className="mb-8 flex items-center gap-2">
        <Terminal className="h-6 w-6" />
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-widest">REVENUE//</span>
          <span className="text-sm font-black tracking-widest text-[var(--color-ink)]/70">RECOVERY</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) => `block border px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
              isActive
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "border-transparent text-[var(--color-ink)] hover:border-[var(--color-border-subtle)]"
            }`}
          >
            {link.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-4 pt-4 border-t border-[var(--color-border-subtle)]">
        <a href="#" className="block px-3 py-2 text-sm font-bold uppercase tracking-wider text-[var(--color-ink)] hover:underline">
          Settings
        </a>
        <div className="flex items-center justify-between px-3">
          <span className="text-xs font-bold uppercase">Mode</span>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-subtle)] bg-[var(--color-paper)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] transition-colors"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-none bg-[var(--color-success)]" />
            <span className="text-xs font-bold uppercase">System Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}
